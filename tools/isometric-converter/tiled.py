"""Finite, single-atlas Tiled conversion and preview helpers."""
import base64
import gzip
from pathlib import Path
import struct
import xml.etree.ElementTree as ET
import zlib

from PIL import Image


def write_xml(root, path):
    ET.indent(root)
    ET.ElementTree(root).write(path, encoding="utf-8", xml_declaration=True)


def dimensions(element):
    return int(element.get("width", "0")), int(element.get("height", "0"))


def load_map(path):
    root = ET.parse(path).getroot()
    orientation = root.get("orientation")
    if root.tag != "map" or orientation not in {"orthogonal", "isometric"} or root.get("infinite", "0") != "0":
        raise ValueError("Expected a finite orthogonal or isometric TMX")
    sets = root.findall("tileset")
    if len(sets) != 1:
        raise ValueError("TMX must reference exactly one atlas")
    ref = sets[0]
    if ref.get("source"):
        source = path.parent / ref.attrib["source"]
        return root, ref, ET.parse(source).getroot(), source.parent
    return root, ref, ref, path.parent


def read_gids(data):
    encoding, compression = data.get("encoding"), data.get("compression")
    if encoding == "base64":
        raw = base64.b64decode("".join((data.text or "").split()), validate=True)
        if compression == "zlib":
            raw = zlib.decompress(raw)
        elif compression == "gzip":
            raw = gzip.decompress(raw)
        elif compression:
            raise ValueError(f"Unsupported TMX compression: {compression}")
        return [gid for (gid,) in struct.iter_unpack("<I", raw)]
    if not compression and encoding == "csv":
        return [int(value) for value in (data.text or "").strip().split(",")]
    if not compression and encoding is None:
        return [int(tile.attrib["gid"]) for tile in data.findall("tile")]
    raise ValueError(f"Unsupported TMX layer encoding: {encoding}")


def make_layer(root, name, gids):
    w, h = dimensions(root)
    layer = ET.SubElement(root, "layer", id="1", name=name, width=str(w), height=str(h))
    set_gids(layer, gids, w)


def set_gids(layer, gids, width):
    data = layer.find("data")
    if data is None:
        data = ET.SubElement(layer, "data")
    data.clear()
    data.set("encoding", "csv")
    rows = [",".join(map(str, gids[start:start + width])) for start in range(0, len(gids), width)]
    data.text = "\n" + ",\n".join(rows) + "\n"


def prepare_map(root, ref, height, tile_count):
    width, rows = dimensions(root)
    if min(width, rows) < 1:
        raise ValueError("TMX map dimensions must be positive")
    if any(child.tag not in {"properties", "tileset", "layer", "objectgroup"} for child in root):
        raise ValueError("TMX groups and image layers require manual migration")
    first_gid = int(ref.attrib["firstgid"])
    if first_gid < 1:
        raise ValueError("TMX firstgid must be positive")
    layers = []
    for layer in root.findall("layer"):
        offset = any(float(layer.get(attr, 0)) for attr in ("x", "y", "offsetx", "offsety"))
        parallax = any(float(layer.get(attr, 1)) != 1 for attr in ("parallaxx", "parallaxy"))
        if dimensions(layer) != (width, rows) or offset or parallax:
            raise ValueError("TMX tile layers must cover the map with standard positioning")
        if layer.get("tintcolor") or layer.get("blendmode", "normal") != "normal":
            raise ValueError("TMX tint and blend modes require manual migration")
        data = layer.find("data")
        if data is None or data.find("chunk") is not None:
            raise ValueError("TMX requires finite layer data")
        gids = read_gids(data)
        if len(gids) != width * rows:
            raise ValueError("TMX layer data length does not match map dimensions")
        if any(gid and not first_gid <= gid < first_gid + tile_count for gid in gids):
            raise ValueError("TMX GIDs must reference this atlas without flip/rotation flags")
        set_gids(layer, gids, width)
        layers.append((layer, [gid - first_gid if gid else None for gid in gids]))

    # Tiled stores isometric object coordinates in height-sized logical units on both axes.
    old_height = int(root.attrib["tileheight"])
    old_width = old_height if root.get("orientation") == "isometric" else int(root.attrib["tilewidth"])
    if min(old_width, old_height) < 1:
        raise ValueError("TMX tile dimensions must be positive")
    scale_x, scale_y = height / old_width, height / old_height
    for group in root.findall("objectgroup"):
        if any(float(group.get(attr, 0)) for attr in ("x", "y", "offsetx", "offsety")):
            raise ValueError("TMX object layer offsets require manual migration")
        for obj in group.findall("object"):
            if any(attr in obj.attrib for attr in ("gid", "template")) or float(obj.get("rotation", "0")):
                raise ValueError("TMX tile objects, templates and rotated objects require manual migration")
            if any(child.tag not in {"properties", "point", "polygon", "polyline", "ellipse"} for child in obj):
                raise ValueError("Unsupported TMX object shape")
            for key, scale in (("x", scale_x), ("y", scale_y), ("width", scale_x), ("height", scale_y)):
                if key in obj.attrib:
                    obj.set(key, f"{float(obj.attrib[key]) * scale:.12g}")
            for shape in list(obj.findall("polygon")) + list(obj.findall("polyline")):
                points = (point.split(",") for point in shape.attrib["points"].split())
                shape.set("points", " ".join(f"{float(x)*scale_x:.12g},{float(y)*scale_y:.12g}" for x, y in points))

    root.attrib.update(orientation="isometric", tilewidth=str(2 * height), tileheight=str(height))
    ref.clear()
    ref.attrib.update(firstgid=str(first_gid), source="tileset.tsx")
    return layers


def render_map(root, layers, tiles, height):
    width, rows = dimensions(root)
    image = Image.new("RGBA", ((width + rows) * height, (width + rows) * height // 2))
    for layer, indices in layers:
        if layer.get("visible", "1") == "0":
            continue
        opacity = float(layer.get("opacity", "1"))
        for index, tile_id in enumerate(indices):
            if tile_id is None:
                continue
            x, y = index % width, index // width
            tile = tiles[tile_id]
            if opacity != 1:
                tile = tile.copy()
                tile.putalpha(tile.getchannel("A").point(lambda alpha: round(alpha * opacity)))
            image.alpha_composite(tile, ((rows - 1 + x - y) * height, (x + y) * height // 2))
    return image

