"""
Generate OG preview card (1200x630) for rabidahal.com.np
Minimal editorial layout — no disc graphic.
Fonts: Arial Bold (display), Consolas Bold (mono).
"""
from PIL import Image, ImageDraw, ImageFont
import os

# ── Brand tokens ─────────────────────────────────────
BG = (10, 10, 10)          # #0A0A0A
FG = (244, 244, 242)        # #F4F4F2
ACCENT = (0, 229, 255)      # #00E5FF
MUTED = (244, 244, 242, 180)  # ~70% white for tagline

W, H = 1200, 630

# ── Fonts ────────────────────────────────────────────
FONT_DIR = r"C:\Windows\Fonts"
display_font_path = os.path.join(FONT_DIR, "arialbd.ttf")
mono_font_path = os.path.join(FONT_DIR, "consolab.ttf")


def font(path, size):
    return ImageFont.truetype(path, size)


# ── Canvas ───────────────────────────────────────────
img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)

# Subtle vertical grid lines (12 columns, 20px gap — Swiss grid echo)
col_w = W / 12
for i in range(1, 12):
    x = int(col_w * i)
    draw.line([(x, 0), (x, H)], fill=(244, 244, 242, 8), width=1)

# ── Layout ───────────────────────────────────────────
pad_x = 80
pad_top = 60

# Section label (top-left, cyan mono)
draw.text((pad_x, pad_top), "[ 01 / EMBEDDED SYSTEMS & IOT ]",
          fill=ACCENT, font=font(mono_font_path, 14))

# Giant name
name_font = font(display_font_path, 155)
draw.text((pad_x, 110), "RABI", fill=FG, font=name_font)
draw.text((pad_x, 250), "DAHAL", fill=FG, font=name_font)

# Role subtitle
role_font = font(display_font_path, 80)
draw.text((pad_x, 405), "EMBEDDED ENGINEER", fill=FG, font=role_font)

# Cyan horizontal rule
rule_y = 505
draw.rectangle([pad_x, rule_y, pad_x + 360, rule_y + 4], fill=ACCENT)

# Tagline (mono, muted)
tagline_font = font(mono_font_path, 14)
draw.text((pad_x, 522),
          "WIRING SENSORS, WRITING CODE & CHASING WEIRD",
          fill=MUTED, font=tagline_font)
draw.text((pad_x, 542),
          "IDEAS INTO WORKING MACHINES.",
          fill=MUTED, font=tagline_font)

# Bottom bar — left: URL, right: location
bottom_font = font(mono_font_path, 13)
draw.text((pad_x, H - 38), "PROOBKER.GITHUB.IO",
          fill=ACCENT, font=bottom_font)
draw.text((W - pad_x - 200, H - 38), "KATHMANDU // NEPAL",
          fill=FG, font=bottom_font)

# Bottom cyan rule
draw.rectangle([pad_x, H - 52, W - pad_x, H - 48], fill=ACCENT)

# ── Save ─────────────────────────────────────────────
out_path = os.path.join(os.path.dirname(__file__), "..", "..", "assets", "og-preview-card.jpg")
out_path = os.path.normpath(out_path)
img.save(out_path, "JPEG", quality=90)
print(f"Saved: {out_path}  ({W}x{H})")
