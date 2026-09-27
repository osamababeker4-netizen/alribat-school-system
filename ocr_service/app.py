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

app = FastAPI(title="Alribat Arabic HTR", version="1.0.0")
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

def _line_crops(image: Image.Image):
    clean, dark = _prepare_page(image)
    h, w = dark.shape
    row_ink = dark.mean(axis=1)
    active = row_ink > max(0.0025, np.quantile(row_ink, 0.55) * 0.20)
    bands = _runs(active, max_gap=max(5, h // 350))

    crops = []
    for y0, y1 in bands:
        if y1 - y0 < max(10, h // 180):
            continue
        pad_y = max(5, int((y1 - y0) * 0.28))
        y0 = max(0, y0 - pad_y)
        y1 = min(h, y1 + pad_y)
        band = dark[y0:y1, :]
        col_ink = band.mean(axis=0)
        col_active = col_ink > 0.006
        groups = _runs(col_active, max_gap=max(18, w // 85))
        candidates = []
        for x0, x1 in groups:
            width = x1 - x0
            if width < max(45, w // 45):
                continue
            density = float(band[:, x0:x1].sum())
            # Prefer wide text clusters; table numbers are usually narrow.
            score = density * (1.0 + min(width / max(w, 1), 0.55))
            candidates.append((score, x0, x1))
        if candidates:
            _, x0, x1 = max(candidates)
        else:
            cols = np.flatnonzero(col_active)
            if cols.size == 0:
                continue
            x0, x1 = int(cols[0]), int(cols[-1] + 1)
        pad_x = max(12, int((x1 - x0) * 0.08))
        x0 = max(0, x0 - pad_x)
        x1 = min(w, x1 + pad_x)
        crop = clean.crop((x0, y0, x1, y1))
        if crop.width < 60 or crop.height < 14:
            continue
        crops.append((y0, crop))

    # Merge accidental duplicates caused by diacritics or close row fragments.
    dedup = []
    last_y = -10_000
    for y, crop in sorted(crops, key=lambda z: z[0]):
        if y - last_y < max(8, h // 220) and dedup:
            continue
        dedup.append((y, crop))
        last_y = y
    return [c for _, c in dedup[:80]]

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
    return {"ok": True, "engine": "arabic-htr", "model": MODEL_REPO}

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
        "engine": "arabic-htr",
        "user": user.get("id"),
        "count": len(lines),
        "rows": lines,
    }
