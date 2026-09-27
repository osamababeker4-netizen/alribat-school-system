import io
import os
import re
import sys
import threading
from functools import lru_cache

import httpx
import numpy as np
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from huggingface_hub import snapshot_download
from PIL import Image, ImageEnhance, ImageOps

app = FastAPI(title="Alribat Arabic HTR", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://alribat-school-system.onrender.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["authorization", "content-type"],
)

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
MODEL_REPO = "sdkv2/muharaf-arabic-ocr"

_model_lock = threading.Lock()
_model_bundle = None

def _verify_token(auth_header: str | None):
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(503, "OCR authentication is not configured")
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(401, "Missing session token")
    token = auth_header.split(" ", 1)[1].strip()
    try:
        r = httpx.get(
            SUPABASE_URL + "/auth/v1/user",
            headers={"apikey": SUPABASE_KEY, "authorization": "Bearer " + token},
            timeout=15,
        )
    except Exception:
        raise HTTPException(503, "Unable to verify school session")
    if r.status_code != 200:
        raise HTTPException(401, "Invalid or expired school session")
    return r.json()

def _load_model():
    global _model_bundle
    if _model_bundle is not None:
        return _model_bundle
    with _model_lock:
        if _model_bundle is not None:
            return _model_bundle
        local = snapshot_download(
            MODEL_REPO,
            allow_patterns=[
                "models/ctc_backbone/*",
                "submission_code/*.py",
                "config.json",
            ],
        )
        if local not in sys.path:
            sys.path.insert(0, local)
        from submission_code.torch_models import load_ctc_backbone, recognise_line
        model, charset, cfg = load_ctc_backbone(
            os.path.join(local, "models", "ctc_backbone", "model.pt")
        )
        model.eval()
        _model_bundle = (model, charset, cfg, recognise_line)
        return _model_bundle

def _otsu(gray: np.ndarray) -> int:
    hist = np.bincount(gray.reshape(-1), minlength=256).astype(np.float64)
    total = gray.size
    sum_total = np.dot(np.arange(256), hist)
    sum_b = 0.0
    w_b = 0.0
    max_var = -1.0
    threshold = 160
    for i in range(256):
        w_b += hist[i]
        if w_b <= 0:
            continue
        w_f = total - w_b
        if w_f <= 0:
            break
        sum_b += i * hist[i]
        m_b = sum_b / w_b
        m_f = (sum_total - sum_b) / w_f
        var = w_b * w_f * (m_b - m_f) ** 2
        if var > max_var:
            max_var = var
            threshold = i
    return int(threshold)

def _runs(mask: np.ndarray, max_gap: int = 8):
    idx = np.flatnonzero(mask)
    if idx.size == 0:
        return []
    out = []
    start = prev = int(idx[0])
    for value in idx[1:]:
        value = int(value)
        if value - prev <= max_gap + 1:
            prev = value
            continue
        out.append((start, prev + 1))
        start = prev = value
    out.append((start, prev + 1))
    return out

def _prepare_page(image: Image.Image):
    image = ImageOps.exif_transpose(image).convert("L")
    w, h = image.size
    if w > 2400:
        scale = 2400 / w
        image = image.resize((2400, max(1, int(h * scale))), Image.Resampling.LANCZOS)
    elif w < 1300:
        scale = min(2.0, 1600 / max(1, w))
        image = image.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    image = ImageOps.autocontrast(image, cutoff=1)
    image = ImageEnhance.Contrast(image).enhance(1.25)

    # np.asarray(PIL) can be read-only; this must be a writable copy because
    # the grid-removal pass intentionally paints table rules white.
    arr = np.array(image, dtype=np.uint8, copy=True)
    threshold = _otsu(arr)
    layout_dark = arr < min(220, max(80, threshold + 12))
    dark = layout_dark.copy()

    row_ratio = layout_dark.mean(axis=1)
    col_ratio = layout_dark.mean(axis=0)
    grid_rows = row_ratio > 0.58
    grid_cols = col_ratio > 0.58

    if grid_rows.any():
        for y in np.flatnonzero(grid_rows):
            y0, y1 = max(0, y - 2), min(dark.shape[0], y + 3)
            dark[y0:y1, :] = False
            arr[y0:y1, :] = 255
    if grid_cols.any():
        for x in np.flatnonzero(grid_cols):
            x0, x1 = max(0, x - 2), min(dark.shape[1], x + 3)
            dark[:, x0:x1] = False
            arr[:, x0:x1] = 255

    return Image.fromarray(arr), dark, layout_dark


def _cluster_indices(indices, max_gap=4):
    indices = [int(x) for x in indices]
    if not indices:
        return []
    groups = []
    start = prev = indices[0]
    for value in indices[1:]:
        if value - prev <= max_gap + 1:
            prev = value
            continue
        groups.append((start, prev + 1))
        start = prev = value
    groups.append((start, prev + 1))
    return groups


def _vertical_rules(layout_dark: np.ndarray):
    h, w = layout_dark.shape
    ratios = layout_dark.mean(axis=0)
    threshold = max(0.20, float(np.quantile(ratios, 0.975)) * 0.68)
    strong = np.flatnonzero(ratios >= threshold)
    groups = _cluster_indices(strong, max_gap=max(2, w // 600))
    centers = []
    for x0, x1 in groups:
        cx = int((x0 + x1) / 2)
        if cx < w * 0.015 or cx > w * 0.995:
            continue
        if x1 - x0 > max(18, w // 35):
            continue
        centers.append(cx)
    # Deduplicate very close rules.
    out = []
    for x in sorted(centers):
        if not out or x - out[-1] > max(8, w // 180):
            out.append(x)
    return out


def _name_column_bounds(layout_dark: np.ndarray):
    h, w = layout_dark.shape
    rules = _vertical_rules(layout_dark)
    candidates = [x for x in rules if w * 0.42 <= x <= w * 0.86]
    if candidates:
        # The name column left boundary on the school ledger is the strongest
        # separator close to two-thirds of the page width.
        ratios = layout_dark.mean(axis=0)
        left = max(
            candidates,
            key=lambda x: float(ratios[x]) * (1.0 + max(0.0, 1.0 - abs(x / w - 0.67) / 0.25)),
        )
    else:
        left = int(w * 0.60)

    right_candidates = [x for x in rules if x > left + w * 0.12]
    right = max(right_candidates) if right_candidates else int(w * 0.985)
    if right - left < int(w * 0.18):
        right = int(w * 0.985)
    return max(0, left + 4), min(w, right - 3), rules


def _horizontal_rules(layout_dark: np.ndarray, x0: int, x1: int):
    roi = layout_dark[:, x0:x1]
    if roi.size == 0:
        return []
    row_ratio = roi.mean(axis=1)
    h = layout_dark.shape[0]
    threshold = max(0.22, float(np.quantile(row_ratio, 0.975)) * 0.68)
    strong = np.flatnonzero(row_ratio >= threshold)
    groups = _cluster_indices(strong, max_gap=max(2, h // 800))
    return [
        int((a + b) / 2)
        for a, b in groups
        if (b - a) <= max(16, h // 55)
    ]


def _normalize_line_crop(crop: Image.Image):
    gray = ImageOps.autocontrast(crop.convert("L"), cutoff=1)
    gray = ImageEnhance.Contrast(gray).enhance(1.35)
    arr = np.array(gray, dtype=np.uint8, copy=True)
    ink = arr < min(225, max(90, _otsu(arr) + 18))
    ys, xs = np.where(ink)
    if xs.size:
        bx0, bx1 = max(0, int(xs.min()) - 12), min(gray.width, int(xs.max()) + 13)
        by0, by1 = max(0, int(ys.min()) - 7), min(gray.height, int(ys.max()) + 8)
        gray = gray.crop((bx0, by0, bx1, by1))
    if gray.width < 70 or gray.height < 16:
        return None
    target_h = 72
    scale = target_h / max(gray.height, 1)
    target_w = max(120, min(1500, int(gray.width * scale)))
    gray = gray.resize((target_w, target_h), Image.Resampling.LANCZOS)
    canvas = Image.new("L", (gray.width + 40, target_h + 20), 255)
    canvas.paste(gray, (20, 10))
    return canvas.convert("RGB")


def _ledger_rows(image: Image.Image):
    """Segment the photographed ledger into physical rows and isolate names.

    Returns both normalized name-line crops and normalized row geometry so the
    browser OCR can attach DOB, phone and fee cells to exactly the same row.
    """
    clean, dark, layout_dark = _prepare_page(image)
    h, w = dark.shape
    name_x0, name_x1, vertical_rules = _name_column_bounds(layout_dark)
    rules = sorted(set(_horizontal_rules(layout_dark, name_x0, name_x1)))

    row_specs = []
    if len(rules) >= 4:
        for y0, y1 in zip(rules, rules[1:]):
            height = y1 - y0
            if height < max(20, h // 95) or height > max(170, h // 8):
                continue
            cy = (y0 + y1) / 2
            # Skip the handwritten page title/header band.
            if cy < h * 0.15:
                continue
            pad_y = max(3, int(height * 0.08))
            yy0, yy1 = max(0, y0 + pad_y), min(h, y1 - pad_y)
            roi = dark[yy0:yy1, name_x0:name_x1]
            if roi.size == 0 or float(roi.mean()) < 0.0045:
                continue
            crop = _normalize_line_crop(clean.crop((name_x0, yy0, name_x1, yy1)))
            if crop is None:
                continue
            row_specs.append({
                "y0": yy0,
                "y1": yy1,
                "y": (yy0 + yy1) / 2,
                "crop": crop,
            })

    # Fallback for faint/perspective-distorted ruled lines.
    if len(row_specs) < 2:
        roi = dark[:, name_x0:name_x1]
        row_ink = roi.mean(axis=1)
        active = row_ink > max(0.0035, float(np.quantile(row_ink, 0.58)) * 0.22)
        bands = _runs(active, max_gap=max(6, h // 320))
        row_specs = []
        for y0, y1 in bands:
            if y1 - y0 < max(12, h // 165):
                continue
            cy = (y0 + y1) / 2
            if cy < h * 0.15:
                continue
            pad = max(5, int((y1 - y0) * 0.34))
            yy0, yy1 = max(0, y0 - pad), min(h, y1 + pad)
            crop = _normalize_line_crop(clean.crop((name_x0, yy0, name_x1, yy1)))
            if crop is None:
                continue
            row_specs.append({
                "y0": yy0,
                "y1": yy1,
                "y": (yy0 + yy1) / 2,
                "crop": crop,
            })

    # Merge accidental duplicate bands.
    dedup = []
    last_y = -10_000
    for spec in sorted(row_specs, key=lambda z: z["y"]):
        if spec["y"] - last_y < max(12, h // 170) and dedup:
            continue
        dedup.append(spec)
        last_y = spec["y"]

    return dedup[:80], {
        "imageWidth": w,
        "imageHeight": h,
        "columns": [round(x / max(w, 1), 5) for x in vertical_rules],
        "nameColumn": [
            round(name_x0 / max(w, 1), 5),
            round(name_x1 / max(w, 1), 5),
        ],
    }


def _line_crops(image: Image.Image):
    rows, layout = _ledger_rows(image)
    return rows, layout


_ARABIC_RE = re.compile(r"[\u0600-\u06FF]")
_NON_NAME = re.compile(r"[^\u0600-\u06FF\s]")
_DIACRITICS = re.compile(r"[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]")

def _clean_name(text: str):
    text = _DIACRITICS.sub("", str(text or "")).replace("ـ", " ")
    text = _NON_NAME.sub(" ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def _quality(text: str):
    text = _clean_name(text)
    letters = len(_ARABIC_RE.findall(text))
    words = [w for w in text.split() if len(w) > 1]
    if not text:
        return 0
    score = 30 + min(letters, 24) * 2 + min(len(words), 4) * 8
    if len(words) < 2:
        score -= 22
    if letters < 5:
        score -= 25
    return max(0, min(96, int(score)))

@app.get("/health")
def health():
    return {"ok": True, "engine": "arabic-htr-v2-name-column", "model": MODEL_REPO, "segmentation": "ledger-name-column"}

@app.post("/ocr")
async def ocr(
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None),
):
    user = _verify_token(authorization)
    raw = await file.read()
    if not raw or len(raw) > 12 * 1024 * 1024:
        raise HTTPException(400, "Image is empty or too large")
    try:
        image = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Unsupported image")
    model, charset, cfg, recognise_line = _load_model()
    row_specs, layout = _line_crops(image)
    lines = []
    h = max(1, int(layout.get("imageHeight") or 1))
    for idx, spec in enumerate(row_specs, start=1):
        try:
            raw_text = recognise_line(model, charset, spec["crop"])
            text = _clean_name(raw_text)
        except Exception:
            continue
        if not text:
            continue
        q = _quality(text)
        if len(_ARABIC_RE.findall(text)) < 3:
            continue
        lines.append({
            "row": idx,
            "name": text,
            "quality": q,
            "reviewNeeded": q < 68 or len([w for w in text.split() if len(w) > 1]) < 2,
            "y": round(float(spec["y"]) / h, 5),
            "y0": round(float(spec["y0"]) / h, 5),
            "y1": round(float(spec["y1"]) / h, 5),
        })
    return {
        "engine": "arabic-htr-v2-name-column",
        "user": user.get("id"),
        "count": len(lines),
        "layout": layout,
        "rows": lines,
    }
