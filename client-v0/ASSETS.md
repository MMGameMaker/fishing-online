# Asset reference

This is the map from "what the game draws" to "where the file lives and what it looks like."

**Status: character, NPC and button art is live.** Those pieces load from `public/assets/`
(see [src/referenceArt.js](src/referenceArt.js)) — files copied in from the reference project
after being edited there. Room tiles and decor are still drawn with `<canvas>` calls in
[src/art.js](src/art.js) (flat shapes and colors, no image files) — see section 5.

`D:\Zen-Workplace\pixadom-reference\` is a private local folder (not committed as itself, kept
outside version control) holding the reference project's downloaded-then-repainted art. The specs
below (pixel size, frame layout, naming) describe that folder's files; `public/assets/` holds
edited copies of the subset the game actually loads and draws (section headers below say which).
To update a piece that's already live, edit the file directly under `public/assets/` — no path or
wiring change needed, a reload picks it up.

**The full reference folder is now also copied into this repo**, byte-for-byte, under
[`public/assets/reference/`](public/assets/reference/) (1293 files, ~29MB — the reference
project's whole root: `assets/{fonts,graphics,rooms,spritesheets,tilemaps}` flattened one level,
plus the sibling `images/` (menu icons, favicons, share/badge art), `interfaces/` and `maps/`
(the actual Tiled source maps `tools/build-rooms.mjs` reads — note the asset-only `assets/tilemaps/`
is a different, smaller set). This is the source material for everything *not yet* wired into a
game system (extra NPCs, apartment furniture, menu icons, quest markers, etc. — see "What's not
live yet" below) kept inside the project instead of only existing in the external folder. It is
not optimized or deduplicated against the pieces already live elsewhere under `public/assets/`,
and nothing in the game loads from it yet — it's raw material, copied in with `cp -r`, not wired
to any loading code. To bring a piece from there into an actual game system: copy/edit the
relevant file(s) from `public/assets/reference/...` to the right `public/assets/<category>/` path
and add the loading/rendering code (or ask me to). To rebuild rooms from it, pass
`public/assets/reference` itself as `tools/build-rooms.mjs`'s `<reference-folder>` argument — its
layout matches what the script expects (`maps/`, `assets/...`) except `assets/*` is flattened
directly under `reference/` here rather than nested under `reference/assets/`; if you re-run the
tool, point it at the original `D:\Zen-Workplace\pixadom-reference\` folder instead (same content,
original layout) to avoid the flattening mismatch.

All paths below are relative to `D:\Zen-Workplace\pixadom-reference\` (equivalently
`public/assets/reference/`) unless marked `public/assets/...`.

## 1. Character

The original splits a character into independently colored layers, each its own sprite sheet,
composited at runtime. Frame size is **48×55px** for every layer below unless noted. All four
layers share one frame-naming pattern:

```
player-<pose>-<n>[-<part>-<style>]
```

`<pose>` is `down | left | right | up` (walk/idle, frames 0-3), `sit-down | sit-left | sit-right
| sit-up` (frame 0 only), or `swipe-down | swipe-left | swipe-right | swipe-up` (the rod-cast /
interact pose, frames 0-3). Side-facing frames aren't mirrored in the files — `left` and `right`
are drawn separately.

| Layer | Files | Styles | Frames per style | Source |
|---|---|---|---|---|
| Body (skin tone) | `player-spritesheet-skin-{1,2,3}.png` + shared `player-spritesheet.json` | 3 skin tones (one whole sheet per tone) | 36 (`assets/spritesheets/player-spritesheet.json`) |
| Hair | `hair-spritesheet.png/json`, `hair-2-spritesheet.png/json` | 148 styles (`hair-1`..`hair-84` in the first sheet, `hair-85`..`hair-148` in the second) | 20 (no swipe pose — hair doesn't redraw for casting) | `assets/spritesheets/` |
| Tops | `tops-spritesheet.png/json` | 22 styles (`top-1`..`top-22`) | 36 | `assets/spritesheets/` |
| Bottoms | `bottoms-spritesheet.png/json` | 2 styles (`bottom-1`, `bottom-2`) | 36 | `assets/spritesheets/` |

There's also `hair-custom-spritesheet.png/json` (player-uploaded custom hair in the original —
not worth repainting, it's a different system) and a `*-fishing/` subfolder under `tops/` and
`bottoms/` (`assets/spritesheets/tops/fishing/fishing-clothes-spritesheet-top-{1..22}.png`, same
for bottoms) which looks like alternate recolors for a fishing-rod-holding pose; open one `.json`
if you want to confirm before relying on it.

Hair/tops/bottoms are shape-only (drawn once per style, then tinted); color is chosen separately
at runtime, matching how `shared/config.js` already treats `topColor`/`bottomColor`/`hairColor`
as a separate field from the style index.

**Live**, with a real Look panel: 3 skin tones, 8 hair styles, 8 top styles, 2 bottom styles, all
from `public/assets/characters/` (the full sheets are already copied in, so any of the 148
hair/22 top/2 bottom styles in the reference folder could be added by just widening
`HAIR_STYLES`/`TOPS`/`BOTTOMS` in `shared/config.js` — ask if you want more than 8/8).
`src/player.js` `updateRealFrames()` picks the frame per player's `look`. Color (`hairColor` /
`topColor` / `bottomColor`) only tints styles that are actually flat/grayscale art — see
`HAIR_TINTABLE` / `TOPS_TINTABLE` / `BOTTOMS_TINTABLE` in `shared/config.js`, measured from the
real files; a style that's already colored in the art is left alone instead of being muddied.

## 2. NPCs

Seven original characters have art downloaded. The rebuild currently uses four placeholder NPCs
with different names (`shared/npcs.js`: Gus, Mira, Reed, Theo). **Live**, mapped as Gus→Gizmo,
Mira→Marigold, Reed→Marlin, Theo→Daisy (see `NPC_SPRITES` in
[src/referenceArt.js](src/referenceArt.js)) — sprite frame `0` plus their portrait, from
`public/assets/npcs/`. No walk/idle animation yet (static frame 0), and Barnaby/Helga aren't
copied in or used. If you want different names or a different NPC↔character mapping, say so and
I'll update `NPC_SPRITES` and the dialogue in `shared/npcs.js` to match.

| Character | Spritesheet | Frame size | Frames | Portrait |
|---|---|---|---|---|
| Fergus | `assets/spritesheets/npcs/fergus-spritesheet.png/json` | 25×46 | 14 | `assets/spritesheets/npcs/portraits/fergus-portrait.png` (157×174) |
| Marigold | `assets/spritesheets/npcs/marigold-spritesheet.png/json` | 45×61 | 15 | `.../marigold-portrait.png` (168×175) |
| Marlin | `assets/spritesheets/npcs/marlin-spritesheet.png/json` | 36×52 | 20 | `.../marlin-portrait.png` (146×160) |
| Daisy | `assets/spritesheets/npcs/daisy-spritesheet.png/json` | 38×53 | 20 | no portrait downloaded |
| Gizmo | `assets/spritesheets/npcs/gizmo-spritesheet.png/json` | 30×51 | 20 | `.../gizmo-portrait.png` (157×141) |
| Barnaby | `assets/spritesheets/npcs/barnaby-spritesheet.png/json` | 47×45 | 16 | no portrait downloaded |
| Helga | `assets/rooms/apartmentLobby/helga-spritesheet.png/json` | 46×38 | 12 | no portrait downloaded |

Also: `assets/spritesheets/npcs/bubbles/daisy-speech-bubble.png` (a speech-bubble frame, Daisy
only) and `assets/spritesheets/npcs/quest-complete-spritesheet.png/json` (a one-off "quest done"
burst effect, not tied to one NPC).

**Live**, with animation: [src/npc.js](src/npc.js) renders each NPC as an animated sprite playing
all of that character's real frames (not just frame 0), using `npcFrameCount()` in
[src/referenceArt.js](src/referenceArt.js). Fergus and Helga aren't mapped to a rebuild NPC or
copied into `public/assets/npcs/` yet (their files are still only under
`public/assets/reference/spritesheets/npcs/` and `.../rooms/apartmentLobby/`).

## 3. Buttons, quest markers, name tag

Small, fixed, non-parametric — these are the easiest to drop in as-is once repainted, no
combinatorics.

| What | File | Frame size | Frame names |
|---|---|---|---|
| Sit / get up / fish / speak / interact / teleport buttons | `assets/graphics/spritesheets/button-spritesheet.png/json` | 26×34 | `sitButton`, `sitButtonHover`, `sitButtonPressed`, `getUpButton(Hover/Pressed)`, `fishButton(Hover/Pressed)`, `speakButton(Hover/Pressed)`, `interactButton(Hover/Pressed)`, `teleportButton(Hover/Pressed)`, `waitIcon` — 19 frames total |
| Quest markers (floating over an NPC's head) | `assets/graphics/spritesheets/quest-markers-spritesheet.png/json` | varies per frame | `unrepeatableIncomplete0-7` (offered, 8-frame loop), `questInProgress0-7` (8-frame loop), `questComplete0-4` (5-frame loop) |
| Name tag background | `assets/graphics/npc-name-tag.png` | 29×8 | single image |

**Live**, from `public/assets/ui/button-spritesheet.png/json` — the fish button and the sit/stand
prompts in [src/world.js](src/world.js) and [src/seats.js](src/seats.js) use real `fishButton` /
`sitButton` frames. Quest markers are still plain colored `!` text in [src/npc.js](src/npc.js),
not the real sheet — the raw files now sit under
`public/assets/reference/graphics/spritesheets/quest-markers-spritesheet.png/json` but aren't
copied to `public/assets/ui/` or wired in yet.

## 4. Main menu icons

`images/menu/<name>-icon.png` — real artwork, sizes vary (~37-45px square, see each file).
`images/menu/<name>-bg.png` is **not** an icon — it's a 1×79px vertical color-strip meant to be
stretched as a button background, not something to repaint.

| `<name>` | Used for in the rebuild today |
|---|---|
| `change-look` | Look panel (wired) |
| `inventory` | Bag panel (wired) |
| `quests` | Quests panel (wired) |
| `friends` | Messages panel today; the original's "Friends" is closer to a contact list than our DMs, loose match |
| `groups` | nothing built yet |
| `settings` | nothing built yet |
| `supporter` | nothing built yet |
| `help` | nothing built yet |

**Where the rebuild's version lives today:** [index.html](index.html) menu buttons are plain
text (`Change look`, `Bag`, `Quests`, `Messages`, `Dance`), no icons.

## 5. Rooms — tiles and decor

**Live.** `tools/build-rooms.mjs` composites every kept tile layer's real tile images (handling
Tiled's horizontal/vertical/diagonal flip bits) into one baked background PNG per room, at native
resolution — `public/rooms/<room>.png`. `src/world.js` `drawRoom()` just displays that image; the
old per-tile-average-color canvas (`drawRoomTiles()` in art.js) is gone.

Decor works the same way: `build-rooms.mjs` copies each decor item's real source image (deduped
across rooms) into `public/assets/rooms/decor/`, and the room JSON's `decor[].image` field points
to it. `drawRoom()` renders that as a real sprite. A decor item whose source PNG wasn't captured
in the download has no `image` field and still falls back to a flat colored box (`decor[].color`,
sampled the same way as before) — check `decor[].sourceImage` to find what's missing, same as
`tilesetImages` at the room's top level for the tileset PNGs.

```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('public/rooms/safeArea.json')).decor.filter(d=>!d.image).map(d=>({name:d.name,src:d.sourceImage})))"
```

Every decor item across all 8 rooms now has real art (381/381) — the ~139 whose `*-still.png`
wasn't downloaded are recovered from frame 0 of a same-subject `*-spritesheet.png` elsewhere in
the reference folder (`stillFromSpritesheet()` in build-rooms.mjs). One known inaccuracy: the
~23 "accordionPineRL"/"accordionPineLR" trees (mirrored left/right variants) share one still
image in the source maps, so the LR/RL match is a best-effort guess and roughly half may show the
wrong mirror orientation. Also: a handful of tiles may render with the wrong flip/rotation
(diagonal-flip handling is best-effort, not visually audited tile-by-tile); and tile layers named
`objects foreground` are baked into the same flat background as everything below it, so a
foreground tile detail that should draw *over* a nearby "objectsBelow" decor item (rare) won't.

**To repaint a room's tiles or decor**: edit the files under the reference folder (same paths
`tilesetImages`/`sourceImage` point to) and re-run `node tools/build-rooms.mjs <reference-folder>`
— it regenerates every room's PNG and JSON from scratch, so there's nothing to copy by hand.

## Updating what's already live

For character/NPC/button art, edit the file directly under `public/assets/` (same name, same
pixel size) and reload — nothing else to do. For rooms, see section 5 above (re-run the build
script). If you change a file under the reference folder for something else, copy it to the
matching `public/assets/...` path yourself, or tell me the reference path and I'll copy it over.

## What's not live yet, and what it needs

- **Menu icons** — not copied in. Needs the 8 `images/menu/<name>-icon.png` files copied to
  `public/assets/ui/`, plus swapping the plain-text menu buttons in `index.html`/`style.css` for
  `<img>` tags.
- **Quest markers / name tag** — not copied in. Smallest remaining change: copy the files in,
  load the sheet, swap the plain-text `!` marker in `src/npc.js` for a sprite frame.
- **NPC animation** — NPCs show a static frame 0; the sheets have more frames if you want them
  animated (see section 2's frame counts).
- **Decor missing its source art, and the handful of `*-fishing/` recolor variants under
  `tops/`/`bottoms/`** — see section 5 and the note in section 1.
