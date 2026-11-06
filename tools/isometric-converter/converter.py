"""Batch-convert top-down atlases without modifying source assets."""
import argparse
from copy import deepcopy
import json
from pathlib import Path
import re
import shutil
import sys
import tempfile
import xml.etree.ElementTree as ET
import zlib

from PIL import Image, ImageDraw

from tiled import dimensions, load_map, make_layer, prepare_map, render_map, write_xml
from transform import diamond_sampler, padded, project, seam_check

FLAT = {"ground", "transition"}
KINDS = FLAT | {"object", "animation", "review", "empty"}
TAGS = {
    **dict.fromkeys(("ground", "grass", "sand", "dirt", "stone", "water"), "ground"),
    **dict.fromkeys(("transition", "coastline", "path", "corner", "autotile"), "transition"),
    **dict.fromkeys(("object", "tree", "rock", "bush", "building", "bridge", "dock", "character"), "object"),
    **dict.fromkeys(("animation", "animated"), "animation"),
}


def positive_int(value, name, minimum=1):
    if type(value) is not int or value < minimum:
        raise ValueError(f"{name} must be an integer >= {minimum}")
    return value


def read_inputs(job, base):
    root = ref = tsx = None
    atlas_base = base
    if "tmx" in job:
        if "tsx" in job:
            raise ValueError("Choose either tmx or tsx")
        root, ref, tsx, atlas_base = load_map(base / job["tmx"])
    elif "tsx" in job:
        path = base / job["tsx"]
        tsx, atlas_base = ET.parse(path).getroot(), path.parent
    atlas = {} if tsx is None else tsx.attrib
    if tsx is not None:
        image_refs = tsx.findall("image")
        if tsx.tag != "tileset" or len(image_refs) != 1 or tsx.findall("tile/image"):
            raise ValueError("Expected a single image atlas TSX")
        if image_refs[0].get("trans"):
            raise ValueError("Convert the Tiled color key to true PNG alpha before running")
        if tsx.find("tileoffset") is not None or tsx.find("grid") is not None:
            raise ValueError("Custom tileset grids and offsets require manual migration")
        for field in ("tilewidth", "tileheight", "margin", "spacing"):
            if field in job and job[field] != int(atlas.get(field, 0)):
                raise ValueError(f"{field} disagrees with the tileset metadata")
    if "png" in job:
        path = base / job["png"]
    elif tsx is not None:
        path = atlas_base / image_refs[0].attrib["source"]
    else:
        raise ValueError("Specify png or an atlas TSX/TMX")
    with Image.open(path) as image:
        if image.format != "PNG" or getattr(image, "n_frames", 1) != 1:
            raise ValueError("Expected a static PNG sheet")
        source = image.convert("RGBA")
    width = positive_int(job.get("tilewidth", int(atlas.get("tilewidth", 0))), "tilewidth")
    height = positive_int(job.get("tileheight", int(atlas.get("tileheight", 0))), "tileheight")
    margin = positive_int(job.get("margin", int(atlas.get("margin", 0))), "margin", 0)
    spacing = positive_int(job.get("spacing", int(atlas.get("spacing", 0))), "spacing", 0)
    columns, extra_x = divmod(source.width - 2 * margin + spacing, width + spacing)
    rows, extra_y = divmod(source.height - 2 * margin + spacing, height + spacing)
    if min(columns, rows) < 1 or extra_x or extra_y:
        raise ValueError("PNG dimensions must match the declared grid, margin and spacing exactly")
    count = positive_int(int(atlas.get("tilecount", columns * rows)), "tilecount")
    if columns != int(atlas.get("columns", columns)) or not (columns * (rows - 1) < count <= columns * rows):
        raise ValueError("TSX columns or tilecount disagree with image dimensions")
    tiles = []
    for index in range(count):
        x = margin + index % columns * (width + spacing)
        y = margin + index // columns * (height + spacing)
        tiles.append(source.crop((x, y, x + width, y + height)))
    return path, source, tiles, columns, rows, root, ref, tsx


def classify(job, tiles, tsx, mode):
    metadata = {} if tsx is None else {int(tile.attrib["id"]): tile for tile in tsx.findall("tile")}
    wang_ids = set() if tsx is None else {int(tile.attrib["tileid"]) for tile in tsx.findall(".//wangtile")}
    overrides = {int(tile_id): kind for tile_id, kind in job.get("classes", {}).items()}
    if any(kind not in KINDS for kind in overrides.values()):
        raise ValueError("Unknown tile class")
    if any(not 0 <= index < len(tiles) for index in metadata.keys() | wang_ids | overrides.keys()):
        raise ValueError("Tile metadata references an out-of-range local tile ID")
    classes = []
    for index, tile in enumerate(tiles):
        element = metadata.get(index)
        kind = None
        if element is not None:
            label = element.get("class") or element.get("type", "")
            category = element.find("./properties/property[@name='category']")
            if category is not None:
                label = category.get("value", category.text or "")
            kind = TAGS.get(label.strip().lower())
            if element.find("animation") is not None and kind not in FLAT:
                kind = "animation"
        if index in wang_ids and kind is None:
            kind = "transition"
        if mode == "sprites":
            kind = job.get("sprite_kind", "animation")
            if kind not in {"object", "animation"}:
                raise ValueError("sprite_kind must be object or animation")
        else:
            kind = overrides.get(index, kind or ("ground" if mode == "terrain" else "review"))
        if tile.getchannel("A").getbbox() is None:
            kind = "empty"
        classes.append(kind)
    for index, element in metadata.items():
        animation = element.find("animation")
        if animation is None:
            continue
        frame_ids = [int(frame.attrib["tileid"]) for frame in animation.findall("frame")]
        if not frame_ids or any(not 0 <= tile_id < len(tiles) for tile_id in frame_ids):
            raise ValueError("Animation must reference existing local tile IDs")
        if classes[index] == "animation":
            for frame_id in frame_ids:
                if frame_id not in overrides and classes[frame_id] != "empty":
                    classes[frame_id] = "animation"
    return classes


def write_prompt(path, reference, columns, rows):
    path.write_text(
        f"Use {reference} as the original visual reference. Preserve the asset identity, silhouette, "
        "proportions, poses, facing and frame order. Reconstruct a consistent 3/4 isometric view "
        "with fixed ground pivot, scale and lighting. Add hand-painted pixel detail with crisp "
        "edges, readable clusters and vibrant colors. Export true RGBA PNG with alpha=0 outside "
        "the artwork and no backdrop or checkerboard. Keep exactly "
        f"{columns} columns by {rows} rows ({columns * rows} cells), equal cell size, and the "
        "same frame sequence. Do not add frames. Verify grid, transparency, pivots and motion "
        "before using the result in game.\n",
        encoding="utf-8",
    )


def compare_images(before, after, path, labels):
    left, right = before.copy(), after.copy()
    for image in (left, right):
        image.thumbnail((768, 512), Image.Resampling.NEAREST)
    output = Image.new("RGBA", (left.width + right.width + 30, max(left.height, right.height) + 36), "#1d2937")
    draw = ImageDraw.Draw(output)
    for image, x, label in zip((left, right), (10, left.width + 20), labels):
        draw.text((x, 7), label, fill="white")
        output.alpha_composite(image, (x, 26))
    output.save(path)


def sample_map(height, ids, columns, rows):
    root = ET.Element("map", version="1.4", orientation="isometric", infinite="0",
                      width=str(columns), height=str(rows), tilewidth=str(2 * height),
                      tileheight=str(height), nextlayerid="2", nextobjectid="1")
    ref = ET.SubElement(root, "tileset", firstgid="1")
    make_layer(root, "Terrain", [tile_id + 1 if tile_id is not None else 0 for tile_id in ids])
    return root, ref


def map_seams(layers, tiles, projected, classes, width, pairs):
    failures = []
    checked = 0
    cache = {}
    for layer, ids in layers:
        for index, first in enumerate(ids):
            if first is None or classes[first] not in FLAT:
                continue
            neighbors = []
            if index % width < width - 1:
                neighbors.append(("x", index + 1))
            if index + width < len(ids):
                neighbors.append(("y", index + width))
            for axis, other in neighbors:
                second = ids[other]
                if second is None or classes[second] not in FLAT:
                    continue
                key = (first, second, axis)
                if key not in cache:
                    cache[key] = seam_check(tiles[first], tiles[second], projected[first], projected[second], axis)
                checked += 1
                if any(cache[key].values()):
                    failures.append({"layer": layer.get("name"), "cell": [index % width, index // width],
                                     "ids": [first, second], "axis": axis, **cache[key]})
    return {"checked": checked, "unique_pairs": len(cache), "failures": failures, "basis": pairs}


def export_tsx(tsx, destination, columns, count, atlas, height, padding, classes, warnings):
    result = ET.Element("tileset", version="1.4", name="isometric") if tsx is None else deepcopy(tsx)
    result.attrib.pop("firstgid", None)
    result.attrib.update(tilewidth=str(2 * height), tileheight=str(height), columns=str(columns),
                         tilecount=str(count), margin=str(padding), spacing=str(2 * padding))
    image_ref = result.find("image")
    if image_ref is None:
        image_ref = ET.SubElement(result, "image")
    image_ref.attrib.update(source="tileset.png", width=str(atlas.width), height=str(atlas.height))
    for tile in result.findall("tile"):
        collision = tile.find("objectgroup")
        if collision is not None:
            tile_id = int(tile.attrib["id"])
            write_xml(collision, destination / f"collision-{tile_id}.xml")
            tile.remove(collision)
            warnings.append(f"Tile {tile_id}: original collision geometry exported separately for reprojection")
        animation = tile.find("animation")
        if animation is not None:
            ids = [int(tile.attrib["id"])] + [int(frame.attrib["tileid"]) for frame in animation.findall("frame")]
            if any(classes[tile_id] not in FLAT for tile_id in ids):
                warnings.append(f"Animation {ids[0]} contains placeholder cells. Keep source frames for redraw.")
    write_xml(result, destination / "tileset.tsx")


def convert(job, base, destination):
    mode = job.get("mode", "auto")
    if mode not in {"auto", "terrain", "sprites"}:
        raise ValueError("mode must be auto, terrain or sprites")
    path, source, tiles, columns, rows, root, ref, tsx = read_inputs(job, base)
    classes = classify(job, tiles, tsx, mode)
    warnings = []
    if any(kind in {"object", "animation", "review"} for kind in classes) and source.getchannel("A").getextrema() == (255, 255):
        warnings.append("Source is fully opaque. Existing backgrounds remain opaque.")
    prompts = destination / "ai_prompts"
    prompts.mkdir()
    (destination / "tiles").mkdir()
    seam_report = None
    first_gid = None
    if mode == "sprites":
        if tsx is not None:
            raise ValueError("Sprite mode expects a PNG and grid metadata")
        shutil.copyfile(path, destination / "tileset.png")
        write_prompt(prompts / "sheet.txt", "../tileset.png", columns, rows)
        output_tiles = tiles
        output_size = tiles[0].size
        padding = 0
        compare_images(source, source, destination / "comparison.png", ("Source", "Grid retained for redraw"))
    else:
        height = positive_int(job.get("iso_height", tiles[0].height), "iso_height", 2)
        if height % 2:
            raise ValueError("iso_height must be even for integer half-height map placement")
        padding = positive_int(job.get("padding", 1), "padding", 0)
        output_size = (2 * height, height)
        samples = diamond_sampler(tiles[0].size, height)
        blank = Image.new("RGBA", output_size)
        output_tiles = [project(tile, height, samples) if kind in FLAT else blank for tile, kind in zip(tiles, classes)]
        stride = (output_size[0] + 2 * padding, height + 2 * padding)
        atlas = Image.new("RGBA", (columns * stride[0], rows * stride[1]))
        for index, (tile, kind) in enumerate(zip(output_tiles, classes)):
            atlas.paste(padded(tile, padding), (index % columns * stride[0], index // columns * stride[1]))
            if kind in KINDS - FLAT - {"empty"}:
                tiles[index].save(prompts / f"{index}.png")
                if kind != "animation":
                    write_prompt(prompts / f"{index}.txt", f"{index}.png", 1, 1)
        if "animation" in classes:
            shutil.copyfile(path, prompts / "source.png")
            write_prompt(prompts / "sheet.txt", "source.png", columns, rows)
        if not any(kind in FLAT for kind in classes):
            warnings.append("No terrain was classified. Add tile classes or select terrain mode for a terrain-only sheet.")
        if root is None:
            ids = [index if classes[index] in FLAT else None for index in range(len(tiles))]
            ids += [None] * (columns * rows - len(ids))
            root, ref = sample_map(height, ids, columns, rows)
            basis = "atlas-order contact sheet (adjacency is illustrative)"
        else:
            basis = "source TMX tile-layer adjacency"
            if root.get("orientation") == "isometric":
                warnings.append("TMX placement is isometric. Input texture cells must still contain top-down art.")
        first_gid = int(ref.attrib["firstgid"])
        layers = prepare_map(root, ref, height, len(tiles))
        width = dimensions(root)[0]
        seam_report = map_seams(layers, tiles, output_tiles, classes, width, basis)
        if any(doc is not None and doc.findall(".//property[@type='file']") for doc in (root, tsx)):
            warnings.append("File-valued Tiled properties retain their text. Rebind paths relative to the exported files.")
        if any(index is not None and classes[index] not in FLAT | {"empty"} for _, ids in layers for index in ids):
            warnings.append("TMX references review tiles. Their local IDs are kept with transparent placeholders.")
        export_tsx(tsx, destination, columns, len(tiles), atlas, height, padding, classes, warnings)
        atlas.save(destination / "tileset.png")
        write_xml(root, destination / "map.tmx")
        preview = render_map(root, layers, output_tiles, height)
        preview.save(destination / "preview.png")
        compare_images(source, atlas, destination / "comparison.png", ("Source atlas", "Isometric atlas"))
    for index, tile in enumerate(output_tiles):
        tile.save(destination / "tiles" / f"{index}.png")
    report = {
        "source": job.get("png", path.name), "mode": mode, "grid": [columns, rows], "count": len(tiles),
        "input_cell": list(tiles[0].size), "output_cell": list(output_size), "padding": padding,
        "source_alpha_range": source.getchannel("A").getextrema(), "first_gid": first_gid,
        "seams": seam_report, "warnings": warnings,
        "tiles": [
            {"source_id": i, "output_id": i, "class": kind,
             "status": ("empty" if kind == "empty" else "projected" if kind in FLAT else
                        "source_retained_for_review" if mode == "sprites" else "placeholder_for_review")}
            for i, kind in enumerate(classes)
        ],
    }
    (destination / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("config", type=Path, help="JSON batch configuration")
    parser.add_argument("--output", type=Path, required=True, help="New output directory")
    parser.add_argument("--strict-seams", action="store_true", help="Fail on flagged TMX seams")
    args = parser.parse_args()
    try:
        config = json.loads(args.config.read_text(encoding="utf-8-sig"))
        jobs = config["jobs"]
        if not isinstance(jobs, list) or not jobs:
            raise ValueError("Specify a nonempty jobs list")
        names = set()
        for job in jobs:
            name = job["name"]
            if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_-]*", name) or name.lower() in names:
                raise ValueError(f"Invalid or duplicate job name: {name}")
            names.add(name.lower())
        output = args.output.absolute()
        if output.exists():
            raise ValueError(f"Output directory already exists: {output}")
        output.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix=".isometric-", dir=output.parent) as temp:
            staging = Path(temp) / "batch"
            staging.mkdir()
            for job in jobs:
                directory = staging / job["name"]
                directory.mkdir()
                try:
                    report = convert(job, args.config.resolve().parent, directory)
                except (OSError, ValueError, KeyError, TypeError, ET.ParseError, zlib.error) as error:
                    raise ValueError(f"{job['name']}: {error}") from error
                seams = report["seams"]
                if args.strict_seams and "tmx" in job and seams["failures"]:
                    raise ValueError(f"{job['name']}: {len(seams['failures'])} flagged TMX seams. Run without --strict-seams for the report.")
                print(f"{job['name']}: {report['count']} tiles, {len(report['warnings'])} warnings")
            if output.exists():
                raise ValueError(f"Output directory already exists: {output}")
            staging.rename(output)
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.exit(1, f"Error: {error}\n")


if __name__ == "__main__":
    main()

