"""
Preprocess arc.jpg → arc-disc.png for WebGL disc texture.

Removes the white background outside the disc and applies a soft circular
mask so the disc edges blend cleanly into the dark site background.
"""
from PIL import Image, ImageFilter
import numpy as np
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, "..", ".."))

SRC = os.path.join(PROJECT_ROOT, "assets", "arc.jpg")
DST = os.path.join(PROJECT_ROOT, "assets", "arc-disc.png")
BG_COLOR = np.array([10, 10, 10], dtype=np.float64)  # #0A0A0A

img = Image.open(SRC).convert("RGB")
arr = np.array(img, dtype=np.float64)
h, w = arr.shape[:2]
cx, cy = w / 2, h / 2

# Build radial distance map
y_coords, x_coords = np.mgrid[0:h, 0:w]
dist = np.sqrt((x_coords - cx) ** 2 + (y_coords - cy) ** 2)

# Soft mask: fully opaque inside inner_r, smooth falloff to outer_r
outer_r = 215
inner_r = 195
mask = np.clip((outer_r - dist) / (outer_r - inner_r), 0, 1).astype(np.float64)

# Composite: arc image * mask + dark bg * (1 - mask)
mask3 = mask[:, :, np.newaxis]
composited = arr * mask3 + BG_COLOR * (1 - mask3)

# Also suppress near-white pixels at the edge band (195-220 radius)
# to kill any residual white fringe
edge_band = (dist > inner_r) & (dist < outer_r + 5)
bright = np.all(arr > 210, axis=2)
kill = edge_band & bright
composited[kill] = BG_COLOR

out = Image.fromarray(composited.astype(np.uint8), "RGB")
out.save(DST, "PNG")
print(f"Saved: {DST}  ({w}x{h})")
