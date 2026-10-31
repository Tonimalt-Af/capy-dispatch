# Dev helper: 2x2 contact sheets of audit screenshots (each tile at CSS size).
import sys, glob, os
from PIL import Image, ImageDraw
d = sys.argv[1]; out = sys.argv[2]; os.makedirs(out, exist_ok=True)
fs = sorted(glob.glob(d + '/*.png'))
for k in range(0, len(fs), 4):
    tiles = [Image.open(f) for f in fs[k:k+4]]
    w, h = tiles[0].size[0] // 2, tiles[0].size[1] // 2
    sh = Image.new('RGB', (w * 2 + 6, h * 2 + 6), 'black')
    for i, t in enumerate(tiles):
        t = t.resize((w, h), Image.LANCZOS); sh.paste(t, ((i % 2) * (w + 6), (i // 2) * (h + 6)))
        ImageDraw.Draw(sh).text(((i % 2) * (w + 6) + 4, (i // 2) * (h + 6) + h - 14), os.path.basename(fs[k+i]), fill='red')
    sh.save(f'{out}/sheet-{k//4:02d}.png')
