# Isometric tileset converter

Python CLI for Fishing Online's Web Client art workflow. It projects flat top-down texture cells onto 2:1 diamonds with nearest-neighbor sampling. Keep source art and output in separate directories. Each run takes a new output directory and publishes the batch after every job succeeds.

## Run the island example

From this directory, using Python 3.10 or newer:

```powershell
python -m pip install -r requirements.txt
python converter.py config.json --output out/demo --strict-seams
python -m unittest discover -s tests -v
```

[Example output](example/output/island/) contains [the comparison](example/output/island/comparison.png), [map preview](example/output/island/preview.png), [TMX](example/output/island/map.tmx), [TSX](example/output/island/tileset.tsx), individual PNGs and a [JSON report](example/output/island/report.json). The original procedural test fixture is under [example/source](example/source/). The sample uses 24 × 24 source cells, 48 × 24 diamonds, one pixel of atlas extrusion, 16 tiles and an 11 × 11 map. These dimensions apply to the fixture.

## Configure a batch

Paths are relative to the config file. An existing TSX or TMX can supply the PNG path and tile grid. Use `png` to select an alternate image with the same grid. Each job writes to its own directory.

```json
{
  "jobs": [
    {"name": "lake", "tmx": "art/lake.tmx", "mode": "auto", "iso_height": 24},
    {"name": "terrain", "png": "art/ground.png", "mode": "terrain",
     "tilewidth": 32, "tileheight": 32, "iso_height": 16, "padding": 1},
    {"name": "tree", "png": "art/tree.png", "mode": "sprites",
     "tilewidth": 64, "tileheight": 96, "sprite_kind": "animation"}
  ]
}
```

- **auto** uses TSX tile class/type, the `category` property, animation records and Wang membership. An optional `classes` object such as `{"0": "ground", "1": "transition", "2": "object"}` overrides local IDs. Unclassified cells go to review. Classification uses metadata and alpha occupancy.
- **terrain** uses the same metadata and overrides, treating remaining occupied cells as ground. Use it only when the unclassified cells are flat terrain. Fully transparent cells retain their IDs.
- **sprites** copies the whole source sheet byte for byte, exports RGBA crops and generates a prompt for the full sheet. Use `sprite_kind: "object"` for an object sheet. Set the cell dimensions to match the original sequence. The source PNG keeps its exact alpha or opaque background.
- **Grid and padding.** Supply `tilewidth`, `tileheight`, and optional `margin` and `spacing` for bare PNGs. Dimensions must match the declared grid. `iso_height` defaults to input tile height and must be even. Output width is twice that height. `padding` defaults to 1 pixel per side of each atlas cell, with TSX margin 1 and spacing 2. Individual tiles are unpadded.

## Review output

`report.json` records local IDs, classes, dimensions, alpha range, warnings and seam diagnostics. Compare neighboring source edge texels and inspect projected alpha coverage along placed boundaries. The seam check evaluates actual horizontal and vertical tile neighbors within each TMX tile layer. It treats differing RGBA edge texels and partial alpha at joins as review findings. Some intentionally textured or translucent seams may be acceptable. Use `--strict-seams` to fail a batch on these findings for supplied TMX jobs. For bare PNG or TSX jobs, the map arranges projected IDs in atlas order and its seam results are illustrative.

Objects and unclassified art get blank isometric atlas slots and original reference crops in `ai_prompts/`. Animated sprite sheets can be handled as separate `sprites` jobs. For a mixed atlas, terrain animations explicitly tagged ground/transition keep their Tiled frame references and timing when all frames are classified as terrain. Review the prompt and upload the indicated original sheet or crop manually if using an image model. Confirm silhouette, exact frame count/order, pivot, scale and real alpha before use. The included project tree sheet was reviewed as an 8 × 1 grid using 271 × 720 cells with margin 2. Its black background is baked into the RGB source and requires art cleanup. The mixed farmer/fishing reference sheet has irregular artwork regions and needs manually defined crops.

## Cocos Creator 3.8.x

1. Copy `map.tmx`, `tileset.tsx` and `tileset.png` together under a test project's `assets/`. Enable the Tiled Map engine module and assign the imported TMX asset to a `TiledMap` component under a 2D Canvas.
2. Use nearest min/mag filtering on the texture, with mipmaps disabled and clamp wrapping. Keep the padded atlas as a standalone texture and inspect seams at the intended zoom.
3. Place ground in tile layers. Place tall sprites under a common actor parent with their pivot at the feet. Within that parent, order by decreasing foot Y in Cocos coordinates so lower feet draw later. Use a stable tie-break, such as an entity ID. `TiledLayer.getPositionAt(x, y)` provides the tile's lower-left in the layer's map coordinates. Add half the cell width and height for its center and account for the layer UITransform anchor when converting to world coordinates.
4. Read anchor IDs/properties from `TiledMap.getObjectGroup(...).getObject(...)`. Tiled isometric object coordinates are logical map axes in tile-height units. Point anchors keep their original fractional grid positions. Convert collision shapes from their logical coordinates into the project's physics space and check them visually. TSX tile-local collision shapes are exported as `collision-<id>.xml` for reprojection.

The [Cocos 3.8.8 Web Desktop smoke render](example/output/island/cocos-3.8.8-web.png) loaded all 11 × 11 cells and returned the test anchor at Cocos map coordinates (264, 132) with `properties.fixtureId === "island-center"`. The diamond can show one-pixel holes at some camera or viewport phases even with nearest filtering. At the tested 960 × 640 viewport, shifting the map +0.5 px horizontally relative to the initial centered test placement removed the holes. Verify pixel alignment at each target viewport and zoom.

See [Cocos Tiled Map Resources](https://docs.cocos.com/creator/3.8/manual/en/asset/tiledmap.html), [TiledMap API](https://docs.cocos.com/creator/3.8/api/en/class/TiledMap), and [TiledObjectGroup API](https://docs.cocos.com/creator/3.8/api/en/class/TiledObjectGroup).

## Supported migration scope

The importer accepts finite orthogonal/isometric maps with one image atlas, standard full-map tile layers, unflagged GIDs and unrotated point/area/line objects. It reads CSV, unencoded XML tile elements, and raw/gzip/zlib Base64, and emits CSV with an external TSX. It retains ID ordering, firstgid, Wang relationships and scalar custom properties. Review file-valued properties in their new location. Layered previews show tile art at the initial frame. Infinite maps, image/group layers, nonstandard positioning, flip/rotation flags, tile objects, templates and per-tile image collections require manual migration. Existing texture cells must still be top-down art. Runtime actor sorting, walkability and interactions belong to the Client scene.

