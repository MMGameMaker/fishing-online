"""Export a small reusable terrain kit from local Farming Game World swatches."""
import argparse
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from tiled import write_xml
from transform import diamond_sampler, padded, project

N = 24
LABELS = ("Grass / water", "Grass / dirt", "Wood deck modules")
WANG_CORNERS = (1, 2, 3, 0)


def make_terrain(mask, grass, material, shore):
    tile = Image.new("RGBA", (N, N))
    last = N - 1
    for y in range(N):
        for x in range(N):
            weights = ((last-x)*(last-y), x*(last-y), x*y, (last-x)*y)
            mix = sum(w for i, w in enumerate(weights) if mask & (1 << i)) / last**2
            # Matching logical edges use the same periodic texture and border phase.
            u, v = x % last, y % last
            jitter = ((u * 19 + v * 29 + u * v) % 11 - 5) / 100
            level = mix + jitter
            if level >= .54:
                color = grass[u % 12, v % 12]
            elif shore and .43 <= level < .54:
                color = (105, 105, 57) if level > .50 else (61, 161, 155)
            else:
                color = material[u % 12, v % 12]
            tile.putpixel((x, y), (*color, 255))
    return tile


def make_deck(axis, cap, wood):
    tile = Image.new("RGBA", (N, N))
    for y in range(N):
        for x in range(N):
            along, across = (x, y) if axis == "x" else (y, x)
            if across < 3 or across >= N-3:
                continue
            end = (cap == "start" and along < 2) or (cap == "end" and along >= N-2)
            joint = along % 6
            shade = -43 if end or across in (3, N-4) or joint == 0 else 13 if joint == 1 else 0
            grain = (across*7 + along*11) % 7 - 3
            tile.putpixel((x, y), tuple(max(0, min(255, c + shade + grain)) for c in wood) + (255,))
    return tile


def build(source, output):
    with Image.open(source / "FG_Grounds.png") as original:
        grounds = original.convert("RGBA")
    with Image.open(source / "FG_Grasslands_Spring.png") as original:
        spring = original.convert("RGBA")
    swatches = [grounds.crop((304, 18, 316, 30)), spring.crop((182, 274, 194, 286)),
                spring.crop((17, 132, 29, 144))]
    # The earth sample is a textured border sprite, so fill transparent texels
    # with its opaque base color before treating it as a terrain material.
    materials = []
    for image, base in zip(swatches, ((109, 190, 68), (45, 100, 153), (140, 104, 70))):
        background = Image.new("RGBA", image.size, (*base, 255))
        background.alpha_composite(image)
        materials.append(background.convert("RGB"))
    grass, water, dirt = (image.load() for image in materials)
    wood = spring.getpixel((27, 378))[:3]
    names = [f"{kind}_{mask:02}" for kind in ("shore", "path") for mask in range(16)]
    terrain = [make_terrain(mask, grass, material, shore)
               for material, shore in ((water, True), (dirt, False)) for mask in range(16)]
    decks = [make_deck(axis, cap, wood) for axis in ("x", "y") for cap in ("start", "middle", "end")]
    names += [f"deck_{axis}_{cap}" for axis in ("x", "y") for cap in ("start", "middle", "end")]
    source_tiles = terrain + decks
    columns = 8
    rows = (len(source_tiles)+columns-1)//columns
    sampler = diamond_sampler((N, N), N)
    converted = [project(tile, N, sampler) for tile in source_tiles]
    output.mkdir(parents=True, exist_ok=False)
    individual = output / "tiles"
    individual.mkdir()
    before = Image.new("RGBA", (columns*N, rows*N))
    after = Image.new("RGBA", (columns*(2*N+2), rows*(N+2)))
    gallery = Image.new("RGB", (840, 530), "#202831")
    draw = ImageDraw.Draw(gallery)
    for label, y in zip(LABELS, (12, 182, 352)):
        draw.text((14, y), label, fill="white", font_size=17)
    for index, (name, original, tile) in enumerate(zip(names, source_tiles, converted)):
        x, y = index % columns, index // columns
        before.paste(original, (x*N, y*N))
        after.paste(padded(tile, 1), (x*(2*N+2), y*(N+2)))
        tile.save(individual / f"{index:02}_{name}.png")
        zoom = tile.resize((96, 48), Image.Resampling.NEAREST)
        gallery.paste(zoom, (12+x*103, 39+y*67+(y//2)*36), zoom)
        draw.text((14+x*103, 86+y*67+(y//2)*36), f"{index:02}  {name}", fill="#d7e1e9")
    before.save(output / "top-down.png")
    after.save(output / "isometric.png")
    gallery.save(output / "gallery.png")
    tsx = ET.Element("tileset", version="1.10", name="fishing-lake-kit", tilewidth="48", tileheight="24",
                     columns=str(columns), tilecount=str(len(converted)), margin="1", spacing="2")
    ET.SubElement(tsx, "image", source="isometric.png", width=str(after.width), height=str(after.height))
    wangsets = ET.SubElement(tsx, "wangsets")
    for group, (name, color) in enumerate((("Water", "#2d6499"), ("Dirt", "#8c6846"))):
        first = group*16
        wang = ET.SubElement(wangsets, "wangset", name=f"Grass and {name}", type="corner", tile="-1")
        ET.SubElement(wang, "wangcolor", name=name, color=color, tile=str(first), probability="1")
        ET.SubElement(wang, "wangcolor", name="Grass", color="#6dbe44", tile=str(first+15), probability="1")
        for mask in range(16):
            corners = [str(1 + ((mask >> bit) & 1)) for bit in WANG_CORNERS]
            wangid = ",".join(value for corner in corners for value in ("0", corner))
            ET.SubElement(wang, "wangtile", tileid=str(first+mask), wangid=wangid)
    write_xml(tsx, output / "lake-kit.tsx")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("tilesets", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    build(args.tilesets, args.output)
