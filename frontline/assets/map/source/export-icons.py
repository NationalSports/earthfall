"""Export original SVG glyphs to production 128px PNGs. Requires Pillow, Node, sharp.

Run: python3 frontline/assets/map/source/export-icons.py
Optional environment variables: NODE_BIN, SHARP_MODULE.
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter
import os
import subprocess

source = Path(__file__).resolve().parent
subprocess.run([os.environ.get('NODE_BIN', 'node'), str(source / 'rasterize.cjs')], check=True)
for path in source.glob('*.png'):
    glyph = Image.open(path).convert('RGBA')
    # SVG black regions become transparent cutouts, never coloured glyph pixels.
    mask = ImageChops.multiply(glyph.getchannel('R'), glyph.getchannel('A'))
    outline = mask.filter(ImageFilter.MaxFilter(17))  # 2px at the final resolution
    result = Image.new('RGBA', glyph.size, '#05090f')
    result.putalpha(outline)
    white = Image.new('RGBA', glyph.size, 'white')
    white.putalpha(mask)
    result = Image.alpha_composite(result, white).resize((128, 128), Image.Resampling.LANCZOS)
    alpha = result.getchannel('A').point(lambda a: a if a >= 4 else 0)
    result.putalpha(alpha)
    # Strip invisible RGB to keep transparent padding neutral in other renderers.
    result.paste((0, 0, 0, 0), mask=alpha.point(lambda a: 255 if a == 0 else 0))
    result.save(source.parent / ('map-icon-' + path.stem + '.png'), optimize=True)
    path.unlink()
