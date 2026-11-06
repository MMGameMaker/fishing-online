# Fishing lake prototype

Open output/lake.tmx with its neighboring tileset.tsx and tileset.png. Tile size is 48 × 24 pixels. The map contains one enclosed body of water, a walking loop, one approach path and ten roofed wooden fishing huts with three seats each. The Interaction object group contains Spawn and 30 provisional seat anchors grouped by hut. layout.json describes the cell grid and walkability for client prototyping. The generator checks four-neighbor reachability from Spawn to every seat. The hut art is baked into the terrain layer. Walkability and seat IDs still need to be wired to the game.

## Source and credit

Farming Game World by **ElvGames**. FG_Grounds.png supplies opaque grass swatches. FG_Grasslands_Spring.png supplies earth and wood colors. The conversion uses deterministic pixel sampling and geometry. Shoreline, water, path shapes and hut shapes were authored in the generator. The two concept images guided layout and framing.

## Rebuild

From tools/isometric-converter, with Pillow installed from requirements.txt:

    python example/lake/generate.py "<Farming Game World>/Assets/Tilesets" out/lake

Use a new output directory. Keep the PNG, TMX and TSX together when importing into Cocos. See the converter README for pixel alignment and texture filtering. This map was checked with the Python preview and XML validation. The earlier Cocos smoke render used the separate island fixture.
