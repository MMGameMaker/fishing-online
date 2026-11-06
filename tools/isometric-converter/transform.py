"""Pixel-center sampling and adjacency checks for an isometric raster."""
from PIL import Image


def diamond_sampler(size, height):
    """Return a reusable inverse map. Half-open edges assign every pixel once."""
    width, source_height = size
    diameter = 2 * height
    samples = []
    for y in range(height):
        for x in range(diameter):
            u = 2 * y + x + 1 - height
            v = 2 * y - x + height
            if 0 <= u < diameter and 0 <= v < diameter:
                samples.append((x, y, u * width // diameter, v * source_height // diameter))
    return samples


def project(tile, height, samples):
    result = Image.new("RGBA", (2 * height, height))
    source, target = tile.load(), result.load()
    for x, y, u, v in samples:
        target[x, y] = source[u, v]
    return result


def padded(tile, padding):
    if not padding:
        return tile
    w, h = tile.size
    result = Image.new("RGBA", (w + 2 * padding, h + 2 * padding))
    result.paste(tile, (padding, padding))
    for x in range(padding):
        result.paste(tile.crop((0, 0, 1, h)), (x, padding))
        result.paste(tile.crop((w - 1, 0, w, h)), (padding + w + x, padding))
    width = result.width
    top = result.crop((0, padding, width, padding + 1))
    bottom = result.crop((0, padding + h - 1, width, padding + h))
    for y in range(padding):
        result.paste(top, (0, y))
        result.paste(bottom, (0, padding + h + y))
    return result


def seam_check(first, second, projected_first, projected_second, axis):
    """Compare logical edge texels and coverage across the projected border."""
    w, h = first.size
    if axis == "x":
        edge_a = first.crop((w - 1, 0, w, h))
        edge_b = second.crop((0, 0, 1, h))
    else:
        edge_a = first.crop((0, h - 1, w, h))
        edge_b = second.crop((0, 0, w, 1))
    edge_mismatches = sum(
        a != b and (a[3] or b[3]) != 0
        for a, b in zip(edge_a.get_flattened_data(), edge_b.get_flattened_data())
    )

    height = projected_first.height
    shift_x = height if axis == "x" else -height
    shift_y = height // 2
    a, b = projected_first.load(), projected_second.load()
    gaps = 0
    for y in range(shift_y, height):
        # A center just inside A's outgoing edge, followed by B's entry pixel.
        x = 3 * height - 2 - 2 * y if axis == "x" else 2 * y - height + 1
        adjacent = x + (1 if axis == "x" else -1)
        if min(x, adjacent - shift_x) < 0 or max(x, adjacent - shift_x) >= 2 * height:
            continue
        gaps += a[x, y][3] < 255 or b[adjacent - shift_x, y - shift_y][3] < 255
    return {"edge_texel_mismatches": edge_mismatches, "non_opaque_projected_samples": gaps}

