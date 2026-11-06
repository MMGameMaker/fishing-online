import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET

from PIL import Image

TOOL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOL))
from tiled import read_gids, write_xml
from transform import diamond_sampler, project, seam_check


class ConverterTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.output = self.root / "result"

    def run_batch(self, jobs, strict=False):
        config = self.root / "jobs.json"
        config.write_text(json.dumps({"jobs": jobs}), encoding="utf-8")
        cmd = [sys.executable, str(TOOL / "converter.py"), str(config), "--output", str(self.output)]
        return subprocess.run(cmd + (["--strict-seams"] if strict else []), capture_output=True, text=True)

    def fixture(self):
        fixture = self.root / "source"
        shutil.copytree(TOOL / "example" / "source", fixture)
        return fixture, {"name": "island", "tmx": "source/island.tmx", "iso_height": 32}

    def test_island_id_wang_mapping_transparency_and_position(self):
        fixture, job = self.fixture()
        source_map = ET.parse(fixture / "island.tmx").getroot()
        source_map.find("tileset").set("firstgid", "20")
        data = source_map.find("layer/data")
        gids = [gid + 19 for gid in read_gids(data)]
        data.text = ",".join(map(str, gids))
        write_xml(source_map, fixture / "island.tmx")
        result = self.run_batch([job], strict=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        output = self.output / "island"
        report = json.loads((output / "report.json").read_text())
        self.assertEqual(report["count"], 16)
        self.assertEqual(report["seams"]["checked"], 220)
        self.assertFalse(report["seams"]["failures"])
        self.assertEqual([(t["source_id"], t["output_id"]) for t in report["tiles"]], [(i, i) for i in range(16)])
        atlas = Image.open(output / "tileset.png")
        self.assertEqual((atlas.mode, atlas.size), ("RGBA", (264, 136)))
        for index in range(16):
            tile = Image.open(output / "tiles" / f"{index}.png")
            self.assertEqual(tile.size, (64, 32))
            self.assertEqual(tile.getchannel("A").getextrema(), (0, 255))
            x, y = (index % 4) * 66 + 1, (index // 4) * 34 + 1
            self.assertEqual(tile.tobytes(), atlas.crop((x, y, x + 64, y + 32)).tobytes())
        root = ET.parse(output / "map.tmx").getroot()
        self.assertEqual(root.get("orientation"), "isometric")
        self.assertEqual(root.find("tileset").get("firstgid"), "20")
        self.assertEqual(read_gids(root.find("layer/data")), gids)
        anchor = root.find("objectgroup/object")
        self.assertEqual((anchor.get("x"), anchor.get("y")), ("176", "176"))
        self.assertEqual(anchor.find("properties/property").get("value"), "island-center")
        src_tsx = ET.parse(fixture / "top-down.tsx").getroot()
        out_tsx = ET.parse(output / "tileset.tsx").getroot()
        self.assertEqual([t.attrib for t in src_tsx.findall(".//wangtile")],
                         [t.attrib for t in out_tsx.findall(".//wangtile")])
        with Image.open(output / "preview.png") as preview:
            self.assertEqual(preview.size, (704, 352))

    def test_strict_seam_failure_keeps_batch_unpublished(self):
        fixture, job = self.fixture()
        path = fixture / "top-down.png"
        with Image.open(path) as original:
            image = original.copy()
        image.paste((255, 0, 0, 0), (23, 0, 24, 24))
        image.save(path)
        result = self.run_batch([job], strict=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("flagged TMX seams", result.stderr)
        self.assertFalse(self.output.exists())

    def test_batch_preserves_sprite_grid_and_protects_existing_output(self):
        sheet = self.root / "sprite.png"
        image = Image.new("RGBA", (32, 32))
        image.putpixel((16, 16), (15, 245, 70, 110))
        image.save(sheet)
        jobs = [
            {"name": "sprite", "png": "sprite.png", "mode": "sprites", "tilewidth": 8, "tileheight": 8},
            {"name": "mixed", "png": "sprite.png", "tilewidth": 8, "tileheight": 8, "classes": {"10": "object"}},
        ]
        result = self.run_batch(jobs)
        self.assertEqual(result.returncode, 0, result.stderr)
        sprite = self.output / "sprite"
        self.assertEqual(sheet.read_bytes(), (sprite / "tileset.png").read_bytes())
        self.assertIn("4 columns by 4 rows (16 cells)", (sprite / "ai_prompts/sheet.txt").read_text())
        self.assertEqual(len(list((sprite / "tiles").glob("*.png"))), 16)
        self.assertEqual(Image.open(sprite / "tiles/10.png").getpixel((0, 0)), (15, 245, 70, 110))
        mixed = self.output / "mixed"
        self.assertIsNone(Image.open(mixed / "tiles/10.png").getbbox())
        self.assertEqual(Image.open(mixed / "ai_prompts/10.png").getpixel((0, 0)), (15, 245, 70, 110))
        self.assertIn("already exists", self.run_batch(jobs).stderr)

    def test_half_open_raster_tiles_without_pixel_overlap(self):
        for height in (2, 4, 16, 24, 32):
            color = (85, 155, 65, 130)
            flat = Image.new("RGBA", (17, 13), color)
            tile = project(flat, height, diamond_sampler(flat.size, height))
            self.assertEqual(set(tile.get_flattened_data()), {(0, 0, 0, 0), color})
            occupied = {(x, y) for y in range(height) for x in range(2 * height) if tile.getpixel((x, y))[3]}
            self.assertEqual(len(occupied), height**2)
            for dx, dy in ((height, height // 2), (-height, height // 2), (0, height)):
                self.assertTrue(occupied.isdisjoint({(x + dx, y + dy) for x, y in occupied}))
            for axis in ("x", "y"):
                self.assertGreater(seam_check(flat, flat, tile, tile, axis)["non_opaque_projected_samples"], 0)


if __name__ == "__main__":
    unittest.main()

