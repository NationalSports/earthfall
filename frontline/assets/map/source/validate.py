"""Validate the delivered tactical-map images. Requires Pillow and numpy."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ICONS = 'player squad survivor enemy brute warlord nest outpost wreck cache relay lz blackbox objective waypoint strike unknown'.split()
expected = {f'map-icon-{n}.png': (128, 128) for n in ICONS}
expected.update({f'map-ramp-{n}.png': (256, 8) for n in ['la', 'kepler', 'ceres']})
expected.update({f'map-detail-{n}.jpg': (512, 512) for n in ['la', 'kepler', 'ceres']})
expected.update({'map-frame.png': (2048, 2048), 'map-grain.png': (1024, 1024), 'map-panel.jpg': (600, 1600)})
report = {'passed': False, 'production_assets': len(expected), 'files': {}}
hashes = set()
for name, size in expected.items():
    path = ROOT / name
    with Image.open(path) as probe:
        probe.verify()
    image = Image.open(path)
    image.load()
    assert image.size == size, (name, image.size)
    assert image.format == ('JPEG' if name.endswith('.jpg') else 'PNG'), name
    a = np.array(image)
    item = {'size': list(size), 'mode': image.mode, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
    if name.startswith('map-icon-'):
        assert image.mode == 'RGBA', name
        alpha = a[:, :, 3]
        box = image.getchannel('A').getbbox()
        assert box and min(box[0], box[1], 128-box[2], 128-box[3]) >= 12, (name, box)
        assert alpha.min() == 0 and alpha.max() == 255, name
        assert np.sum(np.all(a[:, :, :3] == 255, axis=2) & (alpha == 255)) > 400, name
        # The only non-white chromaticity is the subtle blue-black outline.
        opaque = a[:, :, :3][alpha > 250].astype(int)
        assert np.max(np.ptp(opaque, axis=1)) <= 14, name
        assert item['sha256'] not in hashes, name
        hashes.add(item['sha256'])
        small = np.array(image.resize((24, 24), Image.Resampling.LANCZOS))
        assert np.sum((small[:, :, 0] > 200) & (small[:, :, 3] > 180)) >= 15, name
        item.update(alpha_bbox=list(box), transparent_pixels=int(np.sum(alpha == 0)), phone_white_pixels=int(np.sum((small[:, :, 0] > 200) & (small[:, :, 3] > 180))))
    elif name == 'map-frame.png':
        assert image.mode == 'RGBA'
        assert a[160:1888, 160:1888, 3].max() == 0
        item['center_fully_transparent'] = True
    elif name == 'map-grain.png':
        assert image.mode == 'RGBA'
        assert a[:, :, 3].min() >= 15 and a[:, :, 3].max() <= 31
        assert np.array_equal(a[0], a[-1]) and np.array_equal(a[:, 0], a[:, -1])
        item.update(alpha_min=int(a[:, :, 3].min()), alpha_max=int(a[:, :, 3].max()), alpha_mean_percent=round(float(a[:, :, 3].mean()/255*100), 3), exact_periodic_edges=True)
    elif name.startswith('map-detail-'):
        v = a.astype(float)
        horizontal = float(np.abs(v[:, 0] - v[:, -1]).max())
        vertical = float(np.abs(v[0] - v[-1]).max())
        assert max(horizontal, vertical) <= 2, (name, horizontal, vertical)
        assert 2 < float(v.std(axis=(0, 1)).max()) < 4
        item.update(max_wrap_delta_rgb=[horizontal, vertical], channel_std=[round(float(s), 3) for s in v.std(axis=(0, 1))])
    elif name.startswith('map-ramp-'):
        assert image.mode == 'RGB'
        assert np.array_equal(a, np.repeat(a[:1], 8, axis=0))
        item.update(low_rgb=a[0, 0].tolist(), high_rgb=a[0, -1].tolist())
    report['files'][name] = item
mockup = Image.open(ROOT / 'map-mockup.jpg')
assert mockup.size == (1920, 1080)
report['mockup'] = {'size': [1920, 1080], 'path': 'map-mockup.jpg', 'kind': 'layout study using delivered assets'}
report['passed'] = True
(ROOT / 'qa' / 'validation.json').write_text(json.dumps(report, indent=2) + '\n')
print(f'PASS: {len(expected)} production assets + 1920x1080 mockup; dimensions, decoding, alpha, 12px padding, 24px glyph coverage, periodic seams.')
