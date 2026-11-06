# Fishing Online — AI 2D Asset Redraw Prompt (MVP Revised)

## 1. Art Direction

### Target Style
**High-detail Top-down Pixel Art** for a large playable map.

### Visual goals
- 2D **top-down** or **slight 3/4 top-down**.
- **High-detail pixel art**, richer and more detailed than simple farm-RPG tiles.
- **Fresh, vibrant, colorful palette**.
- Clear, intentional pixel clusters.
- Richer texture on grass, dirt, water, rocks and foliage.
- More detailed than `Beginning Fields`, but still **game-readable**.
- Suitable for **large map usage**, not just close-up concept art.
- Assets must remain **modular, reusable and tilemap-friendly**.

### Hard constraints
- **Do not use isometric perspective.**
- **Do not turn assets into painterly illustrations.**
- **Do not reduce everything to low-detail casual farm tiles.**
- **Do not sacrifice tile connectivity/readability for visual flair.**

## 2. Core Principle

**Create reusable game assets first, attractive art second.**

Every output must prioritize:
1. **Game usability**.
2. **Consistent style**.
3. **Tile connectivity**.
4. **Clean readability at gameplay scale**.

Do not generate a beautiful standalone image that cannot be used as a real tileset or sprite sheet.

## 3. Master Redraw Prompt

> Use the uploaded ORIGINAL sprite sheet or tileset as the strict structural reference. Redraw the asset into **high-detail top-down pixel art** with a **slight 3/4 top-down feel where appropriate**, using a **fresh, vibrant, colorful palette**. Increase detail, texture, shading and highlights while preserving crisp pixel-art readability, intentional pixel clusters, and clean silhouettes. Keep the asset suitable for a **large playable map**, with more visual richness than simple RPG tiles, but still modular and game-usable. Preserve the original identity, shape language, proportions, and gameplay readability. If the input is a sprite sheet, preserve the **exact source sheet structure**: same rows, same columns, same frame order, same total frame count. If the input is a tileset, preserve or improve the tile organization while keeping assets modular and reusable. Output clean PNG files with proper RGBA transparency where needed. Do not add decorative backgrounds, text, borders, or unrelated environment art. Do not switch to isometric perspective. Do not output painterly concept art.

## 4. Sprite Sheet Rules

### Strict rules
1. Detect and preserve the exact source grid:
   - same `rows`
   - same `columns`
   - same `frame order`
   - same `total frame count`
2. Do **not** invent missing animation unless explicitly requested.
3. Keep scale, pivot, anchor and framing consistent across all cells.
4. Keep facing directions and action order unchanged.
5. Use equal-sized cells.
6. Preserve readable silhouettes at game scale.
7. Transparent RGBA background for isolated characters/props.

### Examples
- Character `4×4` sheet stays `4×4`.
- Tree `1×8` sheet stays `1×8`.

## 5. Tileset Rules

If the input is a tileset or terrain atlas:

### Must do
- Preserve the **top-down** viewpoint.
- Keep or improve **tile usability**.
- Ensure tiles are **modular**.
- Make terrain more detailed while remaining **seamless**.
- Maintain consistent tile dimensions and alignment.
- Keep textures consistent across related tiles.

### Terrain quality rules
- Grass must tile cleanly.
- Dirt/path must tile cleanly.
- Water must tile cleanly.
- Shore edges must connect correctly.
- Corners and transitions must feel intentional.
- The same terrain family must share consistent lighting and texture density.
- No obvious seams or broken edge transitions.

### Important
Do **not** generate a single large scenic illustration and call it a tileset.

Do **not** cut arbitrary parts of a pretty image into tiles unless those tiles are actually designed to connect.

## 6. Large Map Quality Rules

Because the target is a **large game map**, assets should have:
- Richer texture variety.
- Stronger but controlled detail.
- Enough surface variation to avoid flat repetition.
- Enough clarity to still read well when many tiles are on screen.

### Balance rules
- More detailed than low-detail farm RPG tiles.
- Less messy than painterly concept art.
- Decorative, but still structured.
- Rich, but not noisy.
- Detailed, but still modular.

## 7. Template — Character Redraw

> Redraw the supplied character sheet into **high-detail top-down pixel art** for a large-map game. Preserve the **exact original rows, columns, total cells and frame order**. Maintain the same character identity, outfit, hairstyle, body proportions, facing directions and animation poses. Increase texture detail, pixel shading and highlights, but keep the sprite clean, readable and consistent at gameplay scale. Do not introduce isometric perspective. Do not invent new poses or equipment unless requested. Keep pivot and framing consistent in every frame. Export as a transparent RGBA PNG sprite sheet.

## 8. Template — Tree / Prop Redraw

> Redraw the supplied tree or environmental prop into **high-detail top-down pixel art** with a slight 3/4 top-down feel where appropriate. Preserve the original shape, silhouette and recognizability while increasing texture detail, foliage richness, bark variation and shading quality. Keep the result suitable for use on a large map, with more detail than simple RPG props but still clean and reusable in-game. If the input is animated, preserve the exact source grid and frame count. Use transparent RGBA background and do not add unrelated scenery.

## 9. Template — Terrain / Ground Tileset Redraw

> Redraw the supplied terrain tileset into **high-detail top-down pixel art** for a large playable map. Preserve the functional purpose of each tile and maintain or improve the original modular tile structure. Create richer grass, dirt, path, water and shoreline textures using a vibrant color palette, stronger shading and more material definition, while keeping the tiles clearly readable and seamlessly connectable. Every tile must remain reusable in a tilemap. Do not convert the set into an isometric perspective. Do not generate a decorative illustration in place of a usable tileset. Keep tile dimensions, grid alignment, and connectivity consistent.

## 10. Template — Water / Lake Tileset

> Create or redraw a **lake and shoreline tileset** in **high-detail top-down pixel art** for a large map. The set must be modular and game-usable. Include water center tiles, shoreline edge tiles, inner corners, outer corners, and transition pieces between water and grass/ground. The water should look vibrant, clean and appealing, with visible pixel-art wave texture and light reflections, but remain tileable. The shoreline should feel natural and organic while still connecting cleanly between tiles. The tiles must be suitable for assembling a complete lake inside a real tilemap. Do not output a single lake illustration. Output a real modular tileset.

## 11. Template — New Seated Fishing Pose

> Use the uploaded character as the identity reference. Create a new seated fishing pose or fishing idle animation in **high-detail top-down pixel art** with slight 3/4 top-down readability. Preserve the same character identity, outfit and proportions. If a sprite sheet is requested, follow the explicitly requested rows and columns exactly. Keep the pose readable for gameplay, with consistent anchor and frame alignment. Do not switch to isometric. Do not add full scenery unless requested. Transparent RGBA output.

## 12. Negative Prompt

> Isometric view, diamond perspective, blurry edges, smoothed pixels, painterly concept art, photorealism, realistic 3D, vector illustration, muddy colors, dull palette, overly rustic tint, low-detail mobile farm style, inconsistent texture density, broken tile seams, disconnected shoreline, misaligned pivots, wrong grid dimensions, reordered frames, extra/missing limbs, inconsistent scale, giant decorative background, fake transparency, checkerboard painted into image, text, watermarks, borders.

## 13. Production Checklist

### For sprite sheets
- [ ] Exact row/column count preserved.
- [ ] Exact frame order preserved.
- [ ] Equal cell dimensions.
- [ ] Pivot and scale consistent.
- [ ] Character identity preserved.
- [ ] Clean RGBA transparency.

### For tilesets
- [ ] Tile dimensions consistent.
- [ ] Terrain tiles connect seamlessly.
- [ ] Water and shoreline tiles connect correctly.
- [ ] No broken corners or edge seams.
- [ ] Texture style consistent across related tiles.
- [ ] Assets remain modular and reusable.
- [ ] Output is a real tileset, not a decorative illustration.

### For all outputs
- [ ] Top-down / slight 3/4 only.
- [ ] More detailed than simple RPG tiles.
- [ ] Still readable for gameplay.
- [ ] Suitable for a large game map.
- [ ] No isometric perspective.
- [ ] No painterly standalone image pretending to be game assets.

## 14. Final Note

> AI output is only a draft until validated in an art editor or engine. For terrain tiles and lakes, always test real tile connectivity before considering the result usable in production.
