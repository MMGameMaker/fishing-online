"""Generate the W02 lake from two local ElvGames textures and authored geometry."""
import argparse
from collections import deque
import json
from math import atan2, hypot, sin
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from tiled import make_layer, render_map, write_xml
from transform import diamond_sampler, padded, project

W, H, SIZE, BORDER = 52, 48, 24, 8
def shore(x, y):
    dx, dy = (x - 18) / 13.4, (y - 16) / 10.6
    angle = atan2(dy, dx)
    return (hypot(dx, dy) - 1) * 9 + .53*sin(3*angle + .4) + .38*sin(7*angle) + .20*sin(13*angle) + .09*sin(29*angle + .6)


def make_huts():
    huts = []
    sides = (("x", 1, (10, 19)), ("x", -1, (9, 20)),
             ("y", 1, (9, 16, 24)), ("y", -1, (8, 15, 23)))
    for axis, inward, stations in sides:
        for fixed in stations:
            scan = range(18) if inward == 1 else range(35, 17, -1)
            wet = next(along for along in scan if all(
                shore(along+.5, fixed+i+.5) < -.22 if axis == "x"
                else shore(fixed+i+.5, along+.5) < -.22 for i in range(3)
            ))
            start, end = (wet-4, wet+1) if inward == 1 else (wet, wet+5)
            huts.append((axis, start, end, fixed, inward, wet))
    return huts


HUTS = make_huts()


def pier_at(x, y):
    for axis, start, end, fixed, inward, _ in HUTS:
        along, cross = (x, y) if axis == "x" else (y, x)
        if start <= along < end and fixed <= cross < fixed + 3:
            run = along-start if inward == 1 else end-along
            return axis, run, cross-fixed, end-start, inward == 1
    return None

def tint(rgb, delta):
    return tuple(max(0, min(255, c + delta)) for c in rgb)


def build(src, out):
    grass = Image.open(src / "FG_Grounds.png").convert("RGB")
    spring = Image.open(src / "FG_Grasslands_Spring.png").convert("RGB")
    grass_a = grass.crop((302, 16, 318, 32)).load()
    grass_b = grass.crop((302, 80, 318, 96)).load()
    earth = spring.getpixel((22, 138))
    plank = spring.getpixel((27, 378))
    out.mkdir(parents=True, exist_ok=False)
    ground_ids, walkable, images, lookup = [], set(), [], {}
    sampler = diamond_sampler((SIZE, SIZE), SIZE)

    for row in range(H):
        for col in range(W):
            if shore(col + .5 - BORDER, row + .5 - BORDER) > .28 or pier_at(col + .5 - BORDER, row + .5 - BORDER):
                walkable.add((col, row))
            tile = Image.new("RGBA", (SIZE, SIZE))
            pixels = tile.load()
            for j in range(SIZE):
                for i in range(SIZE):
                    gx, gy = (col-BORDER)*SIZE+i, (row-BORDER)*SIZE+j
                    x, y = (gx+.5)/SIZE, (gy+.5)/SIZE
                    d = shore(x, y) + .037*sin(gx*.74 + gy*.52)
                    loop = abs(d - (2.12 + .40*sin(x*.49+y*.39) + .23*sin(y*.72)))
                    entrance = y > 25 and abs(x - (18 + .28*(y-25))) < .95
                    noise = ((gx*383 ^ gy*919 ^ gx*gy*29) % 11) - 5
                    dock = pier_at(x, y)
                    fascia = pier_at(x-.28, y-.28)
                    raised_bank = d < 0 and d > -.95 and shore(x-.58, y-.58) >= 0
                    post = None
                    if d < 0 and dock is None and fascia is None:
                        for shift in (.34, .42, .50, .58, .66):
                            support = pier_at(x-shift, y-shift)
                            if support is None:
                                continue
                            _, run, across, length, _ = support
                            if ((across < .24 or across > 2.76)
                                    and (abs(run % 2.0 - .52) < .15 or length-.48 < run < length-.24)):
                                post = (run, across)
                                break
                    roof = pier_at(x+.96, y+.96)
                    roof_post = False
                    if roof or dock:
                        for lift in (.12, .24, .36, .48, .60, .72, .84):
                            frame = pier_at(x+lift, y+lift)
                            if frame and min(abs(frame[2]-.20), abs(frame[2]-2.80)) < .10:
                                if min(abs(frame[1]-.31), abs(frame[1]-2.63)) < .10:
                                    roof_post = True
                                    break
                    if roof and .15 < roof[1] < 2.85:
                        _, run, cross, _, _ = roof
                        pitch = abs(cross-1.5)
                        edge = min(cross, 3-cross, run-.15, 2.85-run)
                        base = (151, 72, 46) if cross < 1.5 else (106, 49, 38)
                        if pitch < .075:
                            base = (191, 107, 60)
                        if edge < .08:
                            base = (74, 42, 32)
                        seams = int((run + .1*sin(cross*9))*SIZE) % 7
                        rgb = tint(base, (-15 if seams == 0 else 7 if seams == 1 else 0) + noise//2)
                    elif roof_post:
                        rgb = (91, 52, 34)
                    elif dock:
                        _, along, cross, length, main = dock
                        edge = min(cross, 3-cross, along, length-along)
                        board = int(along*SIZE) // 9
                        joint = int(along*SIZE) % 9
                        grain = sin(cross*21 + sin(along*4)*2 + board*.7)
                        base = tuple(c - delta for c, delta in zip(plank, (23, 26, 35) if main else (35, 34, 39)))
                        delta = (board*13 % 17) - 8 + noise
                        if joint == 0 or edge < .045:
                            delta -= 34
                        elif joint == 1 or edge < .1:
                            delta += 18
                        elif grain > .94:
                            delta -= 10
                        bolt = (cross < .14 or cross > 2.86) and abs(along % 2.0 - .52) < .10
                        rgb = tint(base, delta) if not bolt else (110, 68, 45)
                    elif fascia:
                        _, run, _, _, _ = fascia
                        rgb = tint((104, 60, 38), int(run*SIZE) % 9 - 6)
                    elif post is not None:
                        run, across = post
                        rgb = (139, 86, 49) if int((run-across)*SIZE) % 6 < 3 else (91, 55, 39)
                    elif raised_bank:
                        ledge = shore(x-.58, y-.58)
                        strata = sin((x+y)*29 + sin((x-y)*3)*2)
                        color = (110, 88, 52) if ledge > .27 else (91, 68, 47)
                        rgb = tint(color, int(strata*7) + noise)
                    elif d < 0:
                        shoal = max(0, min(4, int((d + 2.0 + .26*sin(x*2-y*3)) * 2.5)))
                        rgb = [(29, 116, 136), (32, 128, 144), (35, 139, 150),
                               (42, 151, 155), (53, 162, 157)][shoal]
                        reflected = sin(x*.51 + y*.93) + sin(x*.79 - y*.55)
                        rgb = tint(rgb, int(reflected*4) + noise//3)
                        if -.18 < d < -.10 and sin(x*9+y*7) > .25:
                            rgb = (121, 189, 159)
                        wave = sin(gx*.085 + gy*.112 + sin(gy*.028)*1.9)
                        if wave > .97 and sin(gx*.17-gy*.08) > .67:
                            rgb = tint(rgb, 17)
                        if pier_at(x-.68, y-.77):
                            rgb = tint(rgb, -24)
                    elif d < .23:
                        rgb = tint(earth, 14 + noise) if d < .09 else tint((112, 141, 64), noise)
                    elif loop < .57 + .12*sin(x*.9-y*.8) or entrance:
                        rim = loop > .50 + .12*sin(x*.9-y*.8) and not entrance
                        rgb = tint((177, 149, 98) if rim else (189, 160, 109), noise)
                        if noise == -5 and (gx + gy) % 7 == 0:
                            rgb = tint(rgb, -14)
                    else:
                        patch = sin(x*.75+y*.42) + sin(x*.32-y*.85)
                        sample = grass_b if patch + noise*.044 < -1.38 else grass_a
                        rgb = tint(sample[gx % 16, gy % 16], int(patch * 4) + noise//2 + (-10 if sample is grass_a else 18))
                    pixels[i, j] = (*rgb, 255)
            converted = project(tile, SIZE, sampler)
            key = converted.tobytes()
            if key not in lookup:
                lookup[key] = len(images)
                images.append(converted)
            ground_ids.append(lookup[key])

    columns = 32
    rows = (len(images) + columns - 1) // columns
    atlas = Image.new("RGBA", (columns*(2*SIZE+2), rows*(SIZE+2)))
    for index, image in enumerate(images):
        atlas.paste(padded(image, 1), (index % columns*(2*SIZE+2), index // columns*(SIZE+2)))
    atlas.save(out / "tileset.png")
    tsx = ET.Element("tileset", version="1.4", name="fishing-lake", tilewidth=str(2*SIZE),
                     tileheight=str(SIZE), columns=str(columns), tilecount=str(len(images)), margin="1", spacing="2")
    ET.SubElement(tsx, "image", source="tileset.png", width=str(atlas.width), height=str(atlas.height))
    write_xml(tsx, out / "tileset.tsx")
    root = ET.Element("map", version="1.4", orientation="isometric", infinite="0",
                      width=str(W), height=str(H), tilewidth=str(2*SIZE), tileheight=str(SIZE),
                      nextlayerid="3", nextobjectid="32")
    ET.SubElement(root, "tileset", firstgid="1", source="tileset.tsx")
    make_layer(root, "Ground_Water_Huts", [i+1 for i in ground_ids])
    group = ET.SubElement(root, "objectgroup", name="Interaction", id="2")
    spawn = (19+BORDER, 30+BORDER)
    queue = deque([spawn])
    visited = {spawn}
    while queue:
        x, y = queue.popleft()
        for cell in ((x-1,y), (x+1,y), (x,y-1), (x,y+1)):
            if cell in walkable and cell not in visited:
                queue.append(cell)
                visited.add(cell)
    seats = []
    huts = {}
    for index, (axis, _, _, fixed, _, wet) in enumerate(HUTS, 1):
        hut_id = f"Hut_{index:02}"
        huts[hut_id] = []
        for cross in range(fixed, fixed+3):
            x, y = (wet, cross) if axis == "x" else (cross, wet)
            cell = (x+BORDER, y+BORDER)
            if cell not in visited:
                raise ValueError(f"Unreachable fishing seat in {hut_id}: {cell}")
            seats.append((hut_id, cell))
            huts[hut_id].append(f"Seat_{len(seats):02}")
    assert len({cell for _, cell in seats}) == 30
    for i, (hut_id, cell) in enumerate([(None, spawn), *seats]):
        point = ET.SubElement(group, "object", id=str(i+1), name="Spawn" if i == 0 else f"Seat_{i:02}",
                              x=str((cell[0]+.5)*SIZE), y=str((cell[1]+.5)*SIZE))
        ET.SubElement(point, "point")
        if hut_id:
            props = ET.SubElement(point, "properties")
            ET.SubElement(props, "property", name="hutId", value=hut_id)
    write_xml(root, out / "lake.tmx")
    (out / "layout.json").write_text(json.dumps({
        "status": "client art prototype; seat IDs are provisional",
        "size": [W, H], "spawn": spawn,
        "seats": {f"Seat_{i:02}": cell for i, (_, cell) in enumerate(seats, 1)},
        "huts": huts,
        "walkable": ["".join("1" if (x,y) in walkable else "0" for x in range(W)) for y in range(H)],
    }, indent=2)+"\n", encoding="utf-8")
    image = render_map(root, [(root.find("layer"), ground_ids)], images, SIZE)
    cx, cy = (H+18-16)*SIZE, (18+16+2*BORDER)*SIZE//2
    image.crop((cx-585, cy-320, cx+585, cy+320)).save(out / "preview.png")
    print(f"{len(images)} atlas cells; {len(seats)} reachable seat markers; {atlas.size} atlas")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("tilesets", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    build(args.tilesets, args.output)
