# Generates the original Tackle Shop room (public/rooms/store.png + store.json decor/colliders)
# and the shopkeeper Hollis sprite sheet. All art is drawn here from simple shapes.
import json, random, sys
from PIL import Image, ImageDraw

OUT = sys.argv[1]          # client-v0 root
SRC_JSON = sys.argv[2]     # current store.json (kept: key/tile/width/height/bounds/teleports)
random.seed(7)
TILE = 30
room = json.load(open(SRC_JSON))
bx, by = room['bounds']['tx'] * TILE, room['bounds']['ty'] * TILE
W, H = room['bounds']['w'] * TILE, room['bounds']['h'] * TILE
def P(x, y): return (x - bx, y - by)
def R(x0, y0, x1, y1): return [x0 - bx, y0 - by, x1 - bx - 1, y1 - by - 1]
hexc = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)

# ---- layout (world px) ----
OX0, OX1, OY0, OY1 = 2070, 2760, 1380, 1980      # outer building
FX0, FX1, FY0, FY1 = 2100, 2730, 1530, 1950      # floor
DOOR = (2385, 2445)
COUNTER = (2290, 1585, 2540, 1640)
TABLES = [(2150, 1720, 2270, 1785), (2560, 1720, 2680, 1785)]
BARRELS = [(2112, 1872, 2150, 1925), (2154, 1884, 2190, 1932), (2680, 1872, 2718, 1925), (2642, 1884, 2678, 1932)]

img = Image.new('RGBA', (W, H), hexc(room['background']))
d = ImageDraw.Draw(img)
# walls
d.rectangle(R(OX0, OY0, OX1, OY1), fill=hexc('#4a3226'))
d.rectangle(R(OX0, OY0, OX1, OY0 + 30), fill=hexc('#6b4632'))
d.rectangle(R(OX0, OY0 + 26, OX1, OY0 + 30), fill=hexc('#3a271d'))
# back wall face: plaster + wainscot
d.rectangle(R(FX0, 1410, FX1, FY0), fill=hexc('#d9a77c'))
for x in range(FX0, FX1, 6):
    for y in range(1410, 1488, 6):
        if random.random() < .08: d.point(P(x + random.randint(0, 5), y + random.randint(0, 5)), fill=hexc('#c99470'))
d.rectangle(R(FX0, 1488, FX1, FY0), fill=hexc('#8a5a3c'))
for x in range(FX0, FX1, 18): d.line([P(x, 1490), P(x, FY0 - 2)], fill=hexc('#74482f'))
d.rectangle(R(FX0, 1486, FX1, 1490), fill=hexc('#5e3b27'))
d.rectangle(R(FX0, FY0 - 3, FX1, FY0), fill=hexc('#4a2f20'))

def shelf(x0, x1):
    for i, y in enumerate((1428, 1456, 1484)):
        x = x0 + 4
        while x < x1 - 14:
            kind = random.choice(['box', 'jar', 'jar', 'tin', 'gap'])
            if kind == 'box':
                w = random.randint(12, 18); h = random.randint(10, 16)
                c = random.choice(['#b5835a', '#9c6b45', '#c79a62'])
                d.rectangle(R(x, y - h, x + w, y), fill=hexc(c), outline=hexc('#5e3b27'))
                x += w + 3
            elif kind == 'jar':
                c = random.choice(['#5aa9e6', '#7bd389', '#e8a33d', '#d96b6b', '#b48ce0'])
                d.rectangle(R(x, y - 13, x + 9, y), fill=hexc(c), outline=hexc('#3a2a2a'))
                d.rectangle(R(x + 1, y - 16, x + 8, y - 13), fill=hexc('#e8e0d0'), outline=hexc('#3a2a2a'))
                x += 12
            elif kind == 'tin':
                c = random.choice(['#a0a8b0', '#c0c6cc'])
                d.ellipse(R(x, y - 8, x + 12, y), fill=hexc(c), outline=hexc('#4a4f55'))
                x += 15
            else:
                x += 8
        d.rectangle(R(x0, y, x1, y + 4), fill=hexc('#6b4430'))
        d.rectangle(R(x0, y + 4, x1, y + 5), fill=hexc('#3e281c'))
    d.rectangle(R(x0 - 4, 1412, x0, 1490), fill=hexc('#5e3b27'))
    d.rectangle(R(x1, 1412, x1 + 4, 1490), fill=hexc('#5e3b27'))
shelf(2120, 2272)
shelf(2558, 2710)
# rod rack behind the counter
d.rectangle(R(2320, 1418, 2510, 1424), fill=hexc('#5e3b27'))
d.rectangle(R(2320, 1476, 2510, 1482), fill=hexc('#5e3b27'))
for i, x in enumerate(range(2332, 2502, 14)):
    c = ['#c94f4f', '#4f86c9', '#e0b040', '#4fae6a', '#a35fc9', '#e07a3a'][i % 6]
    d.line([P(x, 1414), P(x + 3, 1500)], fill=hexc('#2b2018'), width=3)
    d.line([P(x, 1414), P(x + 3, 1500)], fill=hexc(c), width=1)
    d.ellipse(R(x - 2, 1480, x + 6, 1488), fill=hexc('#9aa3ab'), outline=hexc('#3a3f44'))
# hanging fish sign (original simple fish shape)
d.polygon([P(2385, 1446), P(2430, 1434), P(2448, 1446), P(2430, 1458)], fill=hexc('#f0c860'), outline=hexc('#5e3b27'))
d.polygon([P(2448, 1446), P(2460, 1436), P(2460, 1456)], fill=hexc('#f0c860'), outline=hexc('#5e3b27'))
d.point(P(2398, 1443), fill=hexc('#2b2018'))
# lanterns
for x in (2295, 2535):
    d.line([P(x, 1412), P(x, 1426)], fill=hexc('#2b2018'))
    d.rectangle(R(x - 6, 1426, x + 7, 1444), fill=hexc('#ffd77a'), outline=hexc('#3a271d'))
    d.ellipse(R(x - 16, 1418, x + 17, 1452), outline=hexc('#ffe9a8'))
# side walls inner shading
d.rectangle(R(OX0, OY0 + 30, FX0, OY1), fill=hexc('#5a3d2e'))
d.rectangle(R(FX1, OY0 + 30, OX1, OY1), fill=hexc('#5a3d2e'))
d.rectangle(R(FX0 - 4, 1410, FX0, OY1), fill=hexc('#3a271d'))
d.rectangle(R(FX1, 1410, FX1 + 4, OY1), fill=hexc('#3a271d'))
# floor planks
y = FY0
row = 0
while y < FY1:
    base = ['#a8744c', '#9c6b45'][row % 2]
    d.rectangle(R(FX0, y, FX1, y + 15), fill=hexc(base))
    d.line([P(FX0, y + 14), P(FX1 - 1, y + 14)], fill=hexc('#7a5034'))
    off = (row * 47) % 90
    for x in range(FX0 + off, FX1, 90): d.line([P(x, y), P(x, y + 13)], fill=hexc('#7a5034'))
    for _ in range(18): d.point(P(random.randint(FX0, FX1 - 1), y + random.randint(2, 12)), fill=hexc('#8e6040'))
    y += 15; row += 1
d.rectangle(R(FX0, FY0, FX1, FY0 + 6), fill=hexc('#6b4632'))  # wall shadow on floor
# rugs
d.ellipse(R(2330, 1655, 2500, 1715), fill=hexc('#3c6e8f'), outline=hexc('#26485e'))
d.ellipse(R(2342, 1662, 2488, 1708), outline=hexc('#e8d8a8'))
d.rectangle(R(2390, 1712, 2440, 1950), fill=hexc('#3c6e8f'))
d.rectangle(R(2394, 1712, 2436, 1950), outline=hexc('#e8d8a8'))
# potted plants in back corners
for x in (2112, 2690):
    d.rectangle(R(x, 1548, x + 26, 1572), fill=hexc('#b8613f'), outline=hexc('#5e2f1f'))
    for dx, dy in ((4, -14), (12, -20), (20, -12), (8, -6), (18, -4)):
        d.ellipse(R(x + dx - 6, 1548 + dy - 6, x + dx + 6, 1548 + dy + 6), fill=hexc('#4f9a52'), outline=hexc('#2f5e32'))
# bottom wall with doorway and mat
d.rectangle(R(OX0, FY1, OX1, OY1), fill=hexc('#4a3226'))
d.rectangle(R(OX0, FY1, OX1, FY1 + 4), fill=hexc('#6b4632'))
d.rectangle(R(DOOR[0], FY1 - 2, DOOR[1], OY1), fill=hexc('#2a1c15'))
d.rectangle(R(DOOR[0] + 4, FY1 - 18, DOOR[1] - 4, FY1 - 2), fill=hexc('#8a5a3a'), outline=hexc('#5e3b27'))
img.save(f'{OUT}/public/rooms/store.png')

# ---- foreground decor pieces (own images, depth = bottom edge so players sort correctly) ----
import os
os.makedirs(f'{OUT}/public/assets/rooms/shop', exist_ok=True)
decor = []
def piece(name, box, draw_fn):
    x0, y0, x1, y1 = box
    im = Image.new('RGBA', (x1 - x0, y1 - y0), (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(im), x1 - x0, y1 - y0)
    im.save(f'{OUT}/public/assets/rooms/shop/{name}.png')
    decor.append({'name': name, 'x': x0, 'y': y0, 'w': x1 - x0, 'h': y1 - y0, 'depth': y1, 'color': '#8a5a3c',
                  'image': f'rooms/shop/{name}.png', 'anim': None, 'sourceImage': None})

def counter(g, w, h):
    g.rectangle([0, 0, w - 1, 20], fill=hexc('#c99a66'), outline=hexc('#5e3b27'))
    g.rectangle([0, 20, w - 1, h - 1], fill=hexc('#8a5a3c'), outline=hexc('#4a2f20'))
    for x in range(12, w - 12, 40): g.rectangle([x, 28, x + 30, h - 10], outline=hexc('#6b4430'))
    g.rectangle([30, 2, 58, 16], fill=hexc('#6d7a86'), outline=hexc('#2f353b'))      # cash box
    g.rectangle([34, 5, 54, 9], fill=hexc('#a8f0c0'))
    g.ellipse([w - 54, 6, w - 42, 16], fill=hexc('#e8c040'), outline=hexc('#7a5a10'))  # bell
    g.rectangle([w - 100, 6, w - 76, 16], fill=hexc('#e8e0d0'), outline=hexc('#5e3b27'))  # ledger
piece('counter', COUNTER, counter)

def table(g, w, h):
    g.rectangle([4, 14, w - 5, 24], fill=hexc('#b5835a'), outline=hexc('#5e3b27'))
    g.rectangle([10, 24, 16, h - 1], fill=hexc('#7a5034')); g.rectangle([w - 17, 24, w - 11, h - 1], fill=hexc('#7a5034'))
    x = 10
    for c in ('#d96b6b', '#5aa9e6', '#e8a33d', '#7bd389', '#b48ce0'):
        g.rectangle([x, 4, x + 14, 15], fill=hexc(c), outline=hexc('#3a2a2a')); x += 20
    g.ellipse([w - 34, 0, w - 12, 15], fill=hexc('#9aa3ab'), outline=hexc('#3a3f44'))   # bucket
for i, t in enumerate(TABLES): piece(f'table{i + 1}', t, table)

def barrel(g, w, h):
    g.rectangle([2, 4, w - 3, h - 1], fill=hexc('#8a5a3c'), outline=hexc('#3a271d'))
    g.ellipse([2, 0, w - 3, 9], fill=hexc('#a8744c'), outline=hexc('#3a271d'))
    for y in (14, h - 12): g.rectangle([2, y, w - 3, y + 3], fill=hexc('#4a4f55'))
for i, b in enumerate(BARRELS): piece(f'barrel{i + 1}', b, barrel)

# ---- walkable tiles and colliders ----
blocked = ['1'] * (room['width'] * room['height'])
for ty in range(FY0 // TILE + 1, FY1 // TILE):
    for tx in range(FX0 // TILE, FX1 // TILE):
        blocked[ty * room['width'] + tx] = '0'
colliders = [
    {'x': COUNTER[0] - 10, 'y': 1530, 'w': COUNTER[2] - COUNTER[0] + 20, 'h': COUNTER[3] - 1530},
    *({'x': t[0], 'y': t[1] + 22, 'w': t[2] - t[0], 'h': t[3] - t[1] - 22} for t in TABLES),
    *({'x': b[0], 'y': b[1] + 20, 'w': b[2] - b[0], 'h': b[3] - b[1] - 20} for b in BARRELS),
    {'x': 2108, 'y': 1530, 'w': 34, 'h': 44}, {'x': 2686, 'y': 1530, 'w': 34, 'h': 44},
]
room.update({'title': 'Tackle Shop', 'blocked': ''.join(blocked), 'tilesetImages': [], 'colliders': colliders,
             'decor': decor, 'seats': [], 'fishing': []})
json.dump(room, open(f'{OUT}/public/rooms/store.json', 'w'), indent=2)

# ---- shopkeeper Hollis: 4-frame idle sheet + portrait ----
FW, FH = 32, 50
def hollis(frame):
    im = Image.new('RGBA', (FW, FH), (0, 0, 0, 0)); g = ImageDraw.Draw(im)
    dy = 1 if frame in (1, 2) else 0          # gentle breathing bob of the upper body
    g.rectangle([11, 40, 14, 46], fill=hexc('#4a3a2e')); g.rectangle([17, 40, 20, 46], fill=hexc('#4a3a2e'))
    g.rectangle([10, 46, 14, 49], fill=hexc('#2a1e1a')); g.rectangle([17, 46, 21, 49], fill=hexc('#2a1e1a'))
    g.rectangle([8, 24 + dy, 23, 41], fill=hexc('#2f4f7a'))                        # sweater
    g.rectangle([5, 25 + dy, 8, 36 + dy], fill=hexc('#2f4f7a')); g.rectangle([23, 25 + dy, 26, 36 + dy], fill=hexc('#2f4f7a'))
    g.rectangle([5, 37 + dy, 8, 39 + dy], fill=hexc('#e8b48a')); g.rectangle([23, 37 + dy, 26, 39 + dy], fill=hexc('#e8b48a'))
    g.rectangle([11, 28 + dy, 20, 42], fill=hexc('#c8a46a'))                        # apron
    g.line([11, 24 + dy, 11, 28 + dy], fill=hexc('#c8a46a')); g.line([20, 24 + dy, 20, 28 + dy], fill=hexc('#c8a46a'))
    g.rectangle([14, 33 + dy, 17, 36 + dy], fill=hexc('#a8844a'))                    # apron pocket
    g.rectangle([10, 9 + dy, 21, 22 + dy], fill=hexc('#e8b48a'))                     # face
    g.ellipse([8, 15 + dy, 23, 27 + dy], fill=hexc('#d9d9d9'))                      # beard
    g.rectangle([12, 17 + dy, 19, 18 + dy], fill=hexc('#efefef'))                    # moustache
    g.rectangle([15, 15 + dy, 16, 17 + dy], fill=hexc('#d4956a'))                    # nose
    if frame == 3: g.line([12, 14 + dy, 13, 14 + dy], fill=hexc('#2a1e1a')); g.line([18, 14 + dy, 19, 14 + dy], fill=hexc('#2a1e1a'))
    else: g.rectangle([12, 13 + dy, 13, 14 + dy], fill=hexc('#2a1e1a')); g.rectangle([18, 13 + dy, 19, 14 + dy], fill=hexc('#2a1e1a'))
    g.rectangle([8, 4 + dy, 23, 10 + dy], fill=hexc('#6b7a3a'))                      # bucket hat
    g.rectangle([6, 10 + dy, 25, 12 + dy], fill=hexc('#5a6830'))
    g.rectangle([8, 8 + dy, 23, 8 + dy], fill=hexc('#8a9a4a'))
    # dark 1px outline around the whole figure
    px = im.load(); out = im.copy(); po = out.load()
    for y in range(FH):
        for x in range(FW):
            if px[x, y][3] == 0 and any(0 <= x + a < FW and 0 <= y + b < FH and px[x + a, y + b][3] > 0 for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                po[x, y] = hexc('#2a1e1a')
    return out
sheet = Image.new('RGBA', (FW, FH * 4), (0, 0, 0, 0))
frames = []
for i in range(4):
    sheet.paste(hollis(i), (0, i * FH))
    fr = {'x': 0, 'y': i * FH, 'w': FW, 'h': FH}
    frames.append({'filename': f'hollis{i}', 'frame': fr, 'rotated': False, 'trimmed': False,
                   'spriteSourceSize': {'x': 0, 'y': 0, 'w': FW, 'h': FH}, 'sourceSize': {'w': FW, 'h': FH}})
os.makedirs(f'{OUT}/public/assets/npcs/portraits', exist_ok=True)
sheet.save(f'{OUT}/public/assets/npcs/hollis-spritesheet.png')
json.dump({'frames': frames, 'meta': {'image': 'hollis-spritesheet.png', 'size': {'w': FW, 'h': FH * 4}, 'scale': '1'}},
          open(f'{OUT}/public/assets/npcs/hollis-spritesheet.json', 'w'), indent=2)
hollis(0).crop((4, 2, 28, 30)).resize((144, 168), Image.NEAREST).save(f'{OUT}/public/assets/npcs/portraits/hollis-portrait.png')
print('ok', len(decor), 'decor')
