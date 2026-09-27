import io
import os
import re
import sys
import threading
import gc
from functools import lru_cache

os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")

import httpx
import numpy as np
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from huggingface_hub import snapshot_download
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

app = FastAPI(title="Alribat Arabic HTR", version="2.1.0")
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
        import torch
        torch.set_num_threads(1)
        try:
            torch.set_num_interop_threads(1)
        except RuntimeError:
            pass
        from submission_code.torch_models import load_ctc_backbone, recognise_line
        model, charset, cfg = load_ctc_backbone(
            os.path.join(local, "models", "ctc_backbone", "model.pt")
        )
        model.eval()
        try:
            model = torch.quantization.quantize_dynamic(
                model, {torch.nn.Linear}, dtype=torch.qint8
            )
        except Exception:
            pass

        def low_memory_recognise(line_image):
            with torch.inference_mode():
                return recognise_line(model, charset, line_image)

        _model_bundle = (model, charset, cfg, low_memory_recognise)
        gc.collect()
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

def _crop_page_region(image: Image.Image):
    """Crop dark desk/hand/background before ledger segmentation.

    The photographed school notebook is bright paper on a much darker
    background. Keeping the desk in the segmentation image was causing false
    vertical/horizontal rules and chopping Arabic names.
    """
    original = ImageOps.exif_transpose(image).convert("L")
    arr = np.array(original, dtype=np.uint8, copy=False)
    h, w = arr.shape

    # Robust paper mask: use a high brightness threshold but never so high
    # that blue-ruled/aged paper disappears.
    q45 = int(np.quantile(arr, 0.45))
    light_threshold = max(150, min(215, q45))
    light = arr >= light_threshold

    row_fraction = light.mean(axis=1)
    row_idx = np.flatnonzero(row_fraction >= 0.52)
    row_groups = _cluster_indices(row_idx, max_gap=max(5, h // 180))

    y0, y1 = 0, h
    if row_groups:
        ra, rb = max(row_groups, key=lambda z: z[1] - z[0])
        if rb - ra >= h * 0.34:
            pad = max(3, int(h * 0.012))
            y0, y1 = max(0, ra - pad), min(h, rb + pad)

    page_light = light[y0:y1, :]
    col_fraction = page_light.mean(axis=0) if page_light.size else light.mean(axis=0)
    col_idx = np.flatnonzero(col_fraction >= 0.42)
    col_groups = _cluster_indices(col_idx, max_gap=max(5, w // 160))

    x0, x1 = 0, w
    if col_groups:
        ca, cb = max(col_groups, key=lambda z: z[1] - z[0])
        if cb - ca >= w * 0.55:
            pad = max(3, int(w * 0.012))
            x0, x1 = max(0, ca - pad), min(w, cb + pad)

    cropped = original.crop((x0, y0, x1, y1))
    return cropped, {
        "originalWidth": w,
        "originalHeight": h,
        "pageBoxPx": [x0, y0, x1, y1],
    }


def _prepare_page(image: Image.Image):
    image, page_meta = _crop_page_region(image)
    source_w, source_h = image.size

    if source_w > 2400:
        scale = 2400 / source_w
        image = image.resize((2400, max(1, int(source_h * scale))), Image.Resampling.LANCZOS)
    elif source_w < 1300:
        scale = min(2.0, 1600 / max(1, source_w))
        image = image.resize((int(source_w * scale), int(source_h * scale)), Image.Resampling.LANCZOS)

    image = ImageOps.autocontrast(image, cutoff=1)
    image = ImageEnhance.Contrast(image).enhance(1.22)

    arr = np.array(image, dtype=np.uint8, copy=True)
    threshold = _otsu(arr)
    layout_dark = arr < min(220, max(80, threshold + 12))
    dark = layout_dark.copy()

    # Remove only exceptionally long table rules from the OCR bitmap. Do not
    # classify ordinary handwriting strokes as table lines.
    row_ratio = layout_dark.mean(axis=1)
    col_ratio = layout_dark.mean(axis=0)
    grid_rows = row_ratio > 0.72
    grid_cols = col_ratio > 0.72

    if grid_rows.any():
        for y in np.flatnonzero(grid_rows):
            yy0, yy1 = max(0, y - 2), min(dark.shape[0], y + 3)
            dark[yy0:yy1, :] = False
            arr[yy0:yy1, :] = 255
    if grid_cols.any():
        for x in np.flatnonzero(grid_cols):
            xx0, xx1 = max(0, x - 2), min(dark.shape[1], x + 3)
            dark[:, xx0:xx1] = False
            arr[:, xx0:xx1] = 255

    page_meta["processedWidth"] = image.size[0]
    page_meta["processedHeight"] = image.size[1]
    return Image.fromarray(arr), dark, layout_dark, page_meta


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
    ratios = layout_dark.mean(axis=0)
    rules = _vertical_rules(layout_dark)

    # In the official school ledger the name is the right-most wide field.
    # Find its left separator only inside the expected band. The old logic
    # incorrectly treated tall handwritten strokes inside names as vertical
    # rules and cut off the beginning of Arabic names.
    lo, hi = int(w * 0.55), int(w * 0.79)
    if hi > lo:
        smooth = np.convolve(ratios, np.ones(7) / 7.0, mode="same")
        left = int(lo + np.argmax(smooth[lo:hi]))
    else:
        left = int(w * 0.66)

    # Always keep the full right side of the paper; exclude only the tiny
    # extreme margin where handwritten row numbers sometimes appear.
    right = int(w * 0.978)
    if right - left < int(w * 0.19):
        left = int(w * 0.62)

    return max(0, left + 3), min(w, right), rules


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
    target_w = max(120, min(820, int(gray.width * scale)))
    gray = gray.resize((target_w, target_h), Image.Resampling.LANCZOS)
    canvas = Image.new("L", (gray.width + 40, target_h + 20), 255)
    canvas.paste(gray, (20, 10))
    return canvas.convert("RGB")


def _ledger_rows(image: Image.Image):
    """Segment the photographed ledger into physical rows and isolate names.

    Returns both normalized name-line crops and normalized row geometry so the
    browser OCR can attach DOB, phone and fee cells to exactly the same row.
    """
    clean, dark, layout_dark, page_meta = _prepare_page(image)
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

    orig_w = max(1, int(page_meta.get("originalWidth") or w))
    orig_h = max(1, int(page_meta.get("originalHeight") or h))
    px0, py0, px1, py1 = page_meta.get("pageBoxPx") or [0, 0, orig_w, orig_h]
    page_w = max(1, px1 - px0)
    page_h = max(1, py1 - py0)

    def map_x(value):
        return (px0 + (float(value) / max(w, 1)) * page_w) / orig_w

    def map_y(value):
        return (py0 + (float(value) / max(h, 1)) * page_h) / orig_h

    for spec in dedup:
        spec["global_y"] = map_y(spec["y"])
        spec["global_y0"] = map_y(spec["y0"])
        spec["global_y1"] = map_y(spec["y1"])

    return dedup[:45], {
        "imageWidth": orig_w,
        "imageHeight": orig_h,
        "pageBox": [
            round(px0 / orig_w, 5),
            round(py0 / orig_h, 5),
            round(px1 / orig_w, 5),
            round(py1 / orig_h, 5),
        ],
        "columns": [round(map_x(x), 5) for x in vertical_rules],
        "nameColumn": [
            round(map_x(name_x0), 5),
            round(map_x(name_x1), 5),
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
    return {"ok": True, "engine": "arabic-htr-v2.1-page-crop", "model": MODEL_REPO, "segmentation": "paper-crop+ledger-name-column", "modelReady": _model_bundle is not None}

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
            raw_text = recognise_line(spec["crop"])
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
            "y": round(float(spec.get("global_y", spec["y"] / h)), 5),
            "y0": round(float(spec.get("global_y0", spec["y0"] / h)), 5),
            "y1": round(float(spec.get("global_y1", spec["y1"] / h)), 5),
        })
        if idx % 4 == 0:
            gc.collect()
    return {
        "engine": "arabic-htr-v2-name-column",
        "user": user.get("id"),
        "count": len(lines),
        "layout": layout,
        "rows": lines,
    }
