import sys
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
R = Path(__file__).resolve().parent.parent
OUT = R / 'previews/before-after'; OUT.mkdir(parents=True, exist_ok=True)
SCENES = ['01-accueil', '03-planning-vide-coach', '12-planning-j7-charge', '18-mini-jeu', '20-cloture', '21-bilan']
try:
    F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 30)
except Exception:
    F = ImageFont.load_default()
for s in SCENES:
    a = Image.open(R / f'previews/audit/p1/844x390/{s}.png').convert('RGB')
    b = Image.open(R / f'previews/audit/p3/844x390/{s}.png').convert('RGB')
    w, h = a.size; pad = 24; bar = 56
    c = Image.new('RGB', (w * 2 + pad * 3, h + bar + pad), '#FFF6E8')
    d = ImageDraw.Draw(c)
    for i, (img, lab, col) in enumerate([(a, 'AVANT (v0.1)', '#6B5443'), (b, 'APRÈS (polish)', '#2D72C9')]):
        x = pad + i * (w + pad)
        d.text((x, 12), lab, font=F, fill=col)
        c.paste(img, (x, bar))
    c.save(OUT / f'{s}.png', optimize=True)
    print(OUT / f'{s}.png')
