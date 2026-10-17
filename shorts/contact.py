#!/usr/bin/env python3
"""contact.py OUT.jpg "frame.png|label" ... -> grid contact sheet (tiles 270x480, 6 columns)."""
import sys
from PIL import Image, ImageDraw, ImageFont

out, items = sys.argv[1], sys.argv[2:]
TW, TH, COLS, PAD = 270, 480, 6, 6
rows = (len(items) + COLS - 1) // COLS
sheet = Image.new("RGB", (COLS * (TW + PAD) + PAD, rows * (TH + PAD) + PAD), (18, 18, 22))
try:
    font = ImageFont.truetype("/home/user/fortyfive/fonts/Archivo_700Bold.ttf", 15)
except Exception:
    font = ImageFont.load_default()
d = ImageDraw.Draw(sheet)
for i, it in enumerate(items):
    path, _, label = it.partition("|")
    try:
        im = Image.open(path).convert("RGB").resize((TW, TH), Image.LANCZOS)
    except Exception as e:
        im = Image.new("RGB", (TW, TH), (60, 0, 0))
    x, y = PAD + (i % COLS) * (TW + PAD), PAD + (i // COLS) * (TH + PAD)
    sheet.paste(im, (x, y))
    if label:
        d.rectangle([x, y, x + TW, y + 22], fill=(0, 0, 0))
        d.text((x + 6, y + 3), label, fill=(255, 235, 170), font=font)
sheet.save(out, quality=88)
