"""Generate original procedural terrain for the sample island."""
from pathlib import Path
import random
import sys
import xml.etree.ElementTree as ET

from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1]))
from tiled import make_layer, write_xml

SIZE = 24
SIDE = 11
COLORS = [(28, 137, 179), (43, 171, 190), (240, 215, 145), (105, 183, 81), (74, 157, 64)]
CORNERS = [(0, 0), (1, 0), (1, 1), (0, 1)]


def make_tile(mask):
    tile = Image.new("RGBA", (SIZE, SIZE))
    rng = random.Random(mask)
    last = SIZE - 1
    for y in range(SIZE):
        for x in range(SIZE):
            weights = [(last - x) * (last - y), x * (last - y), x * y, (last - x) * y]
            influence = sum(weight for bit, weight in enumerate(weights) if mask & (1 << bit))
            value = influence * 100 // last**2
            color = COLORS[sum(value >= threshold for threshold in (25, 43, 61, 83))]
            noise = rng.choice((-6, -3, 0, 0, 3, 5)) if 0 < x < last and 0 < y < last else 0
            tile.putpixel((x, y), tuple(channel + noise for channel in color) + (255,))
    return tile


def build():
    atlas = Image.new("RGBA", (4 * SIZE, 4 * SIZE))
    tsx = ET.Element("tileset", version="1.10", name="island", tilewidth=str(SIZE),
                     tileheight=str(SIZE), tilecount="16", columns="4")
    ET.SubElement(tsx, "image", source="top-down.png", width=str(atlas.width), height=str(atlas.height))
    wangset = ET.SubElement(ET.SubElement(tsx, "wangsets"), "wangset", name="Shore", type="corner", tile="-1")
    ET.SubElement(wangset, "wangcolor", name="Water", color="#1c89b3", tile="0", probability="1")
    ET.SubElement(wangset, "wangcolor", name="Land", color="#4a9d40", tile="15", probability="1")
    for mask in range(16):
        atlas.paste(make_tile(mask), (mask % 4 * SIZE, mask // 4 * SIZE))
        ET.SubElement(tsx, "tile", id=str(mask), type="ground" if mask in {0, 15} else "transition")
        colors = [str(1 + ((mask >> bit) & 1)) for bit in (1, 2, 3, 0)]
        ET.SubElement(wangset, "wangtile", tileid=str(mask), wangid=",".join(value for c in colors for value in ("0", c)))
    atlas.save(HERE / "top-down.png")
    write_xml(tsx, HERE / "top-down.tsx")

    tmx = ET.Element("map", version="1.4", orientation="orthogonal", infinite="0",
                     width=str(SIDE), height=str(SIDE), tilewidth=str(SIZE), tileheight=str(SIZE),
                     nextlayerid="3", nextobjectid="2")
    ET.SubElement(tmx, "tileset", firstgid="1", source="top-down.tsx")
    gids = [
        1 + sum(1 << bit for bit, (dx, dy) in enumerate(CORNERS)
                if (x + dx - 5)**2 + (y + dy - 6)**2 < 14)
        for y in range(SIDE) for x in range(SIDE)
    ]
    make_layer(tmx, "Terrain", gids)
    group = ET.SubElement(tmx, "objectgroup", id="2", name="Interaction")
    point = ET.SubElement(group, "object", id="1", name="TestAnchor", x=str(5.5 * SIZE), y=str(5.5 * SIZE))
    ET.SubElement(point, "point")
    ET.SubElement(ET.SubElement(point, "properties"), "property", name="fixtureId", value="island-center")
    write_xml(tmx, HERE / "island.tmx")


if __name__ == "__main__":
    build()

