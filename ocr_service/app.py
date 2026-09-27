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
    arr = np.asarray(image, dtype=np.uint8)
    threshold = _otsu(arr)
    dark = arr < min(220, max(80, threshold + 12))

    # Remove long notebook/table rules before finding handwriting bands.
    row_ratio = dark.mean(axis=1)
    col_ratio = dark.mean(axis=0)
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
    return Image.fromarray(arr), dark

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


def _name_column_bounds(dark: np.ndarray):
    """Detect the notebook's right-most wide text column headed by «الاسم».

    The school ledger consistently places the name field on the right side.
    Detecting the vertical rule that separates it from the date/phone columns
    prevents the HTR model from seeing fees, phone numbers, dates and row
    numbers as if they were part of a student's name.
    """
    h, w = dark.shape
    col_ratio = dark.mean(axis=0)

    # Strong vertical rules are long blue/black table strokes. Work only in
    # the middle/right part of the page and ignore the physical paper edge.
    lo, hi = int(w * 0.42), int(w * 0.86)
    threshold = max(0.22, float(np.quantile(col_ratio[lo:hi], 0.985)) * 0.72)
    strong = np.flatnonzero(col_ratio[lo:hi] >= threshold) + lo
    groups = _cluster_indices(strong, max_gap=max(2, w // 500))

    candidates = []
    for x0, x1 in groups:
        cx = (x0 + x1) // 2
        if not (lo <= cx <= hi):
            continue
        strength = float(col_ratio[x0:x1].mean()) if x1 > x0 else float(col_ratio[cx])
        # Prefer the strongest rule in the expected boundary zone. In the
        # photographed ledgers this boundary normally sits around 60–75% W.
        zone_bonus = 1.0 - min(abs(cx / max(w, 1) - 0.67), 0.30)
        candidates.append((strength * (1.0 + zone_bonus), cx))

    if candidates:
        _, left = max(candidates)
    else:
        left = int(w * 0.62)

    # Drop only the thin handwritten row-number strip at the extreme right.
    right = int(w * 0.975)
    if right - left < int(w * 0.18):
        left = int(w * 0.58)
    return max(0, left + 4), min(w, right)


def _horizontal_rules(dark: np.ndarray, x0: int, x1: int):
    roi = dark[:, x0:x1]
    if roi.size == 0:
        return []
    row_ratio = roi.mean(axis=1)
    h = dark.shape[0]
    threshold = max(0.24, float(np.quantile(row_ratio, 0.985)) * 0.72)
    strong = np.flatnonzero(row_ratio >= threshold)
    groups = _cluster_indices(strong, max_gap=max(2, h // 700))
    return [int((a + b) / 2) for a, b in groups if b - a <= max(14, h // 65)]


def _content_rows_in_name_column(clean: Image.Image, dark: np.ndarray, x0: int, x1: int):
    """Return one crop per ledger row from the name column only."""
    h, w = dark.shape
    rules = _horizontal_rules(dark, x0, x1)
    crops = []

    # Use the actual ledger horizontal rules when available. The first useful
    # data row starts below the header area, so ignore very early intervals.
    if len(rules) >= 4:
        rules = sorted(set(rules))
        for y0, y1 in zip(rules, rules[1:]):
            height = y1 - y0
            if height < max(20, h // 90) or height > max(150, h // 9):
                continue
            cy = (y0 + y1) / 2
            if cy < h * 0.16:
                continue
            pad_y = max(3, int(height * 0.08))
            yy0, yy1 = max(0, y0 + pad_y), min(h, y1 - pad_y)
            roi = dark[yy0:yy1, x0:x1]
            if roi.size == 0 or float(roi.mean()) < 0.006:
                continue
            crop = clean.crop((x0, yy0, x1, yy1))
            crops.append((yy0, crop))

    # Fallback for photos where ruled lines are faint or perspective-warped:
    # find handwriting bands, but still only inside the detected name column.
    if len(crops) < 2:
        roi = dark[:, x0:x1]
        row_ink = roi.mean(axis=1)
        active = row_ink > max(0.004, float(np.quantile(row_ink, 0.58)) * 0.23)
        bands = _runs(active, max_gap=max(6, h // 320))
        crops = []
        for y0, y1 in bands:
            if y1 - y0 < max(12, h // 160):
                continue
            cy = (y0 + y1) / 2
            if cy < h * 0.16:
                continue
            pad = max(5, int((y1 - y0) * 0.34))
            yy0, yy1 = max(0, y0 - pad), min(h, y1 + pad)
            band = dark[yy0:yy1, x0:x1]
            if band.size == 0 or float(band.mean()) < 0.006:
                continue
            crops.append((yy0, clean.crop((x0, yy0, x1, yy1))))

    # Normalize every handwritten-name line. The HTR model is a line
    # recognizer, so giving it a clean single-name strip is the critical step.
    normalized = []
    last_y = -10_000
    for y, crop in sorted(crops, key=lambda z: z[0]):
        if y - last_y < max(10, h // 180) and normalized:
            continue
        gray = ImageOps.autocontrast(crop.convert("L"), cutoff=1)
        gray = ImageEnhance.Contrast(gray).enhance(1.35)
        arr = np.asarray(gray, dtype=np.uint8)
        ink = arr < min(225, max(90, _otsu(arr) + 18))
        ys, xs = np.where(ink)
        if xs.size:
            bx0, bx1 = max(0, int(xs.min()) - 12), min(gray.width, int(xs.max()) + 13)
            by0, by1 = max(0, int(ys.min()) - 7), min(gray.height, int(ys.max()) + 8)
            gray = gray.crop((bx0, by0, bx1, by1))
        if gray.width < 70 or gray.height < 16:
            continue
        target_h = 72
        scale = target_h / max(gray.height, 1)
        target_w = max(120, min(1500, int(gray.width * scale)))
        gray = gray.resize((target_w, target_h), Image.Resampling.LANCZOS)
        canvas = Image.new("L", (gray.width + 40, target_h + 20), 255)
        canvas.paste(gray, (20, 10))
        normalized.append(canvas.convert("RGB"))
        last_y = y
    return normalized[:80]


def _line_crops(image: Image.Image):
    clean, dark = _prepare_page(image)
    x0, x1 = _name_column_bounds(dark)
    return _content_rows_in_name_column(clean, dark, x0, x1)


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
    lines = []
    for idx, crop in enumerate(_line_crops(image), start=1):
        try:
            text = _clean_name(recognise_line(model, charset, crop))
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
        })
    return {
        "engine": "arabic-htr-v2-name-column",
        "user": user.get("id"),
        "count": len(lines),
        "rows": lines,
    }
