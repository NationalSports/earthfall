# Packs Poly Haven (CC0) 1k texture sets into the web files the terrain shader reads.
#   <name>-d.webp  colour with the ambient-occlusion map baked in (sRGB)
#   <name>-n.webp  normal X, normal Y (OpenGL), roughness (linear)
# Usage: python3 tools/buildpbr.py <folder with <name>_diff.jpg, _nor.jpg, _arm.jpg and .hdr files>
import sys, os, glob, shutil
from PIL import Image, ImageChops
src, out = sys.argv[1], os.path.join(os.path.dirname(__file__), '..', 'assets', 'pbr')
os.makedirs(out, exist_ok=True)
for d in sorted(glob.glob(os.path.join(src, '*_diff.jpg'))):
    n = os.path.basename(d)[:-9]
    diff = Image.open(d).convert('RGB').resize((1024, 1024), Image.LANCZOS)
    arm = Image.open(os.path.join(src, n + '_arm.jpg')).convert('RGB').resize((1024, 1024), Image.LANCZOS)
    nor = Image.open(os.path.join(src, n + '_nor.jpg')).convert('RGB').resize((1024, 1024), Image.LANCZOS)
    ao = arm.split()[0].point(lambda v: int(255 * (0.45 + 0.55 * v / 255)))
    diff = ImageChops.multiply(diff, Image.merge('RGB', (ao, ao, ao)))
    diff.save(os.path.join(out, n.replace('_', '-') + '-d.webp'), quality=82, method=6)
    r, g, _ = nor.split()
    Image.merge('RGB', (r, g, arm.split()[1])).save(os.path.join(out, n.replace('_', '-') + '-n.webp'), quality=78, method=6)
for h in glob.glob(os.path.join(src, '*.hdr')):
    shutil.copy(h, os.path.join(out, 'env-' + os.path.basename(h).replace('_', '-')))
print(sorted(os.listdir(out)))
