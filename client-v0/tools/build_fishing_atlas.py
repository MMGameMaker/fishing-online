# Packs the per-style fishing clothes sheets (22 tops, 2 bottoms) into one atlas each, and
# copies the fishing body + rod sheets, into public/assets/characters/fishing/.
import json, os, shutil, sys
from PIL import Image
SRC, DST = sys.argv[1], sys.argv[2]   # .../reference/spritesheets, .../public/assets/characters/fishing
os.makedirs(DST, exist_ok=True)
def frames(path):
    d = json.load(open(path)); f = d.get('frames') or d['textures'][0]['frames']
    return [x for x in f] if isinstance(f, list) else [dict(v, filename=v.get('filename', k)) for k, v in f.items()]
def pack(kind, count, out):
    cells = []
    for n in range(1, count + 1):
        base = f'{SRC}/{kind}s/fishing/fishing-clothes-spritesheet-{kind}-{n}'
        im = Image.open(base + '.png').convert('RGBA')
        for fr in frames(base + '.json'):
            r = fr['frame']; cells.append((fr['filename'], im.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h']))))
    W, H = 48, 55; cols = 40; rows = (len(cells) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * W, rows * H)); out_frames = []
    for i, (name, im) in enumerate(cells):
        assert im.size == (W, H), (name, im.size)
        x, y = (i % cols) * W, (i // cols) * H
        sheet.paste(im, (x, y))
        out_frames.append({'filename': name, 'frame': {'x': x, 'y': y, 'w': W, 'h': H}, 'rotated': False, 'trimmed': False,
                           'spriteSourceSize': {'x': 0, 'y': 0, 'w': W, 'h': H}, 'sourceSize': {'w': W, 'h': H}})
    sheet.save(f'{DST}/{out}.png', optimize=True)
    json.dump({'frames': out_frames, 'meta': {'image': f'{out}.png', 'size': {'w': sheet.width, 'h': sheet.height}, 'scale': '1'}},
              open(f'{DST}/{out}.json', 'w'), separators=(',', ':'))
    print(out, len(cells), sheet.size)
pack('top', 22, 'fishing-tops-spritesheet')
pack('bottom', 2, 'fishing-bottoms-spritesheet')
shutil.copy(f'{SRC}/player-fishing-spritesheet.json', f'{DST}/player-fishing-spritesheet.json')
for s in (1, 2, 3): shutil.copy(f'{SRC}/player-fishing-spritesheet-skin-{s}.png', f'{DST}/player-fishing-spritesheet-skin-{s}.png')
shutil.copy(f'{SRC}/fishing-rods-spritesheet.json', f'{DST}/fishing-rods-spritesheet.json')
shutil.copy(f'{SRC}/fishing-rods-spritesheet.png', f'{DST}/fishing-rods-spritesheet.png')
