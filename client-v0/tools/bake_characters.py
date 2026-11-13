"""Ghép nhân vật thỏ và cần câu từ atlas cosmetics thành sheet nhỏ theo hợp đồng ART-02.

Nguồn: public/new resources/anim/atlases/sheet-cosmetics-{0,1,2}.(json|png).
Đầu ra (Phaser JSON Hash, frame `<anim>_<dir>_<i>`):
  public/assets/characters/<skinId>.png/.json   thân thỏ + bóng
  public/assets/rods/<rodId>.png/.json          lớp cần câu, cùng khung và pivot với thân

Các lớp trong atlas gốc cùng gốc trên-trái (thân 48×64, cần 64×55/72/110, bóng 48×64).
Chân thỏ nằm ở (23, 53) trong khung gốc. Hướng trái = lật hướng `side` quanh trục chân.
Atlas không có tư thế bite/reel/success/fail cho thân: dùng tư thế ngồi ghế kèm rung/nhún
và các đoạn của animation quăng cần (xem ANIMS). Chạy lại sau khi đổi bảng SKINS/RODS:

    python tools/bake_characters.py
"""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'public' / 'new resources' / 'anim' / 'atlases'
OUT_SKIN = ROOT / 'public' / 'assets' / 'characters'
OUT_ROD = ROOT / 'public' / 'assets' / 'rods'

# Skin game → màu thân thỏ trong atlas (tạm, chờ GD chốt danh sách skin).
SKINS = {
    'skin_01': 'brown',
    'skin_02': 'cream',
    'skin_03': 'dark',
    'skin_04': 'tan',
    'skin_05': 'vienna-blue',
}
# Cần game → prefix animation cần trong atlas: <prefix>{front,side,back} (20 frame mỗi hướng).
RODS = {
    'rod_old': ('fishing-rod/fishingRod', 'Front', 'Side', 'Back'),
    'rod_steel_awl': ('fishing-rods/pier/normal/', 'front', 'side', 'back'),
    'rod_high_performer': ('fishing-rods/teal/normal/', 'front', 'side', 'back'),
    'rod_bliss': ('fishing-rods/lava/normal/', 'front', 'side', 'back'),
    'rod_giant_caster': ('swamp-fishing-rod/swampFishingRod', 'Front', 'Side', 'Back'),
}
SHADOW = 'general/bunny_shadow'
SILHOUETTE_BODY = 'brown'  # dùng để che phần cần nằm sau lưng khi quay lên

FEET = (23, 53)  # toạ độ chân trong khung gốc
# Khung ghép: chân ở giữa theo chiều ngang; đủ chỗ cho dây câu dài nhất phía trước mặt.
W, H = 120, 140
PIVOT = (W // 2, 76)
OFFSET = (PIVOT[0] - FEET[0], PIVOT[1] - FEET[1])

DIRS = {
    # dir: (hướng thân, chỉ số hướng cần trong RODS, lật ngang)
    'down': ('down', 1, False),
    'up': ('up', 3, False),
    'right': ('side', 2, False),
    'left': ('side', 2, True),
}

# Khung cần (28×110 trước, 64×72 ngang) khác khung thân 48×64 nên đặt trùng góc trái trên thì tay cầm
# rơi xuống cạnh chân. Khi ngồi câu, dời cần để cuộn dây/tay cầm nằm trong tay thỏ (feedback 2026-11-12);
# nhìn ngang đưa cần ra trước người thêm (feedback 2026-11-13: giống tư thế nhìn xuống).
# Giá trị cho hướng 'right'; 'left' là ảnh lật nên dùng dx ngược dấu.
SIT_ROD_OFFSET = {'down': (6, -8), 'right': (16, -7), 'up': (10, -10)}


def rod_offset(dir_name: str, body_index: int | str) -> tuple[int, int]:
    if body_index != SIT:
        return 0, 0
    if dir_name == 'left':
        dx, dy = SIT_ROD_OFFSET['right']
        return -dx, dy
    return SIT_ROD_OFFSET[dir_name]


# Mỗi animation: danh sách (frame thân, frame cần 1-20 hoặc None, dx, dy), fps, lặp.
# Frame thân: số 0-9 là chu kỳ đi bộ (0 = đứng), SIT là tư thế ngồi ghế (sit_down/side/up).
# Câu cá luôn diễn ra khi đang ngồi ghế nên cast..fail dùng thân ngồi.
SIT = 'sit'
ANIMS = {
    'idle': ([(0, None, 0, 0)] * 4, 4, True),
    'walk': ([(i, None, 0, 0) for i in range(10)], 14, True),
    'sit': ([(SIT, None, 0, 0)] * 2, 2, True),
    'cast': ([(SIT, i, 0, 0) for i in range(1, 11)], 14, False),
    'wait': ([(SIT, i, 0, 0) for i in range(11, 21)], 8, True),
    'bite': ([(SIT, 13, -1, 0), (SIT, 14, 1, 0), (SIT, 15, -1, 0), (SIT, 16, 1, 0)], 12, True),
    'reel': ([(SIT, r, 0, b) for r, b in [(20, 0), (19, 1), (18, 0), (19, 1), (20, 0), (19, 1)]], 12, True),
    'success': ([(SIT, r, 0, b) for r, b in [(10, 0), (8, -2), (6, -3), (4, -2), (2, 0), (1, 0)]], 10, False),
    'fail': ([(SIT, r, 0, 0) for r in [10, 9, 7, 5, 3, 1]], 8, False),
}


def body_frame(body: str, body_dir: str, index: int | str) -> str:
    if index == SIT:
        return f'traits/body/{body}/sit_{body_dir}'
    return f'traits/body/{body}/{body_dir}{index}'


class Atlas:
    def __init__(self) -> None:
        self.frames: dict[str, tuple[dict, np.ndarray]] = {}
        self.anims: dict[str, list[str]] = {}
        for i in range(3):
            data = json.loads((SRC / f'sheet-cosmetics-{i}.json').read_text(encoding='utf-8'))
            image = np.asarray(Image.open(SRC / data['meta']['image']).convert('RGBA'))
            for name, frame in data['frames'].items():
                self.frames[name] = (frame, image)
            self.anims.update(data.get('animations', {}))

    def get(self, name: str) -> np.ndarray:
        frame, image = self.frames[name]
        f = frame['frame']
        x, y, w, h = f['x'], f['y'], f['w'], f['h']
        crop = np.rot90(image[y:y + w, x:x + h], 1) if frame['rotated'] else image[y:y + h, x:x + w]
        src = frame['sourceSize']
        out = np.zeros((src['h'], src['w'], 4), np.uint8)
        sx, sy = frame['spriteSourceSize']['x'], frame['spriteSourceSize']['y']
        out[sy:sy + crop.shape[0], sx:sx + crop.shape[1]] = crop
        return out


def place(canvas: np.ndarray, layer: np.ndarray, dx: int, dy: int, flip: bool) -> None:
    """Đặt lớp gốc (gốc trên-trái) lên khung ghép theo OFFSET; lật quanh trục chân nếu cần."""
    src = layer
    x = OFFSET[0] + dx
    if flip:
        src = layer[:, ::-1]
        # Điểm chân sau khi lật: FEET.x → (w-1-FEET.x); dời để chân về đúng PIVOT.
        x = PIVOT[0] - (layer.shape[1] - 1 - FEET[0]) + dx
    y = OFFSET[1] + dy
    h, w = src.shape[:2]
    x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + w, W), min(y + h, H)
    if x1 <= x0 or y1 <= y0:
        return
    s = src[y0 - y:y1 - y, x0 - x:x1 - x].astype(np.float32) / 255
    d = canvas[y0:y1, x0:x1].astype(np.float32) / 255
    a = s[:, :, 3:4] + d[:, :, 3:4] * (1 - s[:, :, 3:4])
    rgb = np.where(a > 0, (s[:, :, :3] * s[:, :, 3:4] + d[:, :, :3] * d[:, :, 3:4] * (1 - s[:, :, 3:4])) / np.maximum(a, 1e-6), 0)
    canvas[y0:y1, x0:x1] = np.round(np.concatenate([rgb, a], axis=2) * 255).astype(np.uint8)


def blank() -> np.ndarray:
    return np.zeros((H, W, 4), np.uint8)


def write_sheet(path: Path, frames: dict[str, np.ndarray], extra: dict) -> None:
    """Gộp frame trùng nhau, xếp lưới, ghi PNG + JSON Hash có anchor (pivot chân)."""
    unique: dict[str, int] = {}
    tiles: list[np.ndarray] = []
    ref: dict[str, int] = {}
    for name, img in frames.items():
        key = hashlib.md5(img.tobytes()).hexdigest()
        if key not in unique:
            unique[key] = len(tiles)
            tiles.append(img)
        ref[name] = unique[key]
    cols = min(16, len(tiles))
    rows = (len(tiles) + cols - 1) // cols
    sheet = np.zeros((rows * H, cols * W, 4), np.uint8)
    for i, tile in enumerate(tiles):
        r, c = divmod(i, cols)
        sheet[r * H:(r + 1) * H, c * W:(c + 1) * W] = tile
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(sheet).save(path.with_suffix('.png'), optimize=True)
    anchor = {'x': PIVOT[0] / W, 'y': PIVOT[1] / H}
    data = {
        'frames': {
            name: {
                'frame': {'x': (i % cols) * W, 'y': (i // cols) * H, 'w': W, 'h': H},
                'rotated': False,
                'trimmed': False,
                'spriteSourceSize': {'x': 0, 'y': 0, 'w': W, 'h': H},
                'sourceSize': {'w': W, 'h': H},
                'anchor': anchor,
            }
            for name, i in ref.items()
        },
        'meta': {'image': path.with_suffix('.png').name, 'size': {'w': sheet.shape[1], 'h': sheet.shape[0]},
                 'format': 'RGBA8888', 'scale': '1', 'source': 'tools/bake_characters.py'},
        **extra,
    }
    path.with_suffix('.json').write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
    print(path.relative_to(ROOT), f'{len(frames)} frame, {len(tiles)} ô riêng, {sheet.shape[1]}×{sheet.shape[0]}')


def bobber_offsets(frames: dict[str, np.ndarray]) -> dict[str, dict[str, int]] | None:
    """Vị trí phao (điểm hồng/đỏ) so với chân trong frame chờ cá, theo từng hướng; dùng cho FX dây câu."""
    out = {}
    for dir_name in DIRS:
        t = frames[f'wait_{dir_name}_0'].astype(int)
        mask = (t[:, :, 3] > 0) & (t[:, :, 0] > 200) & (t[:, :, 1] < 150)
        ys, xs = np.nonzero(mask)
        if len(xs) == 0:
            return None
        out[dir_name] = {'x': int(round(xs.mean())) - PIVOT[0], 'y': int(round(ys.mean())) - PIVOT[1]}
    return out


def main() -> None:
    atlas = Atlas()
    anim_meta = {name: {'frames': len(seq), 'rate': rate, 'loop': loop} for name, (seq, rate, loop) in ANIMS.items()}
    # Độ cao đỉnh đầu (tai) so với chân, để CharacterView đặt nhãn tên/icon.
    body0 = atlas.get(f'traits/body/{SILHOUETTE_BODY}/down0')
    head_top = FEET[1] - int(np.nonzero(body0[:, :, 3])[0].min())
    extra = {'animations': anim_meta, 'pivot': {'x': PIVOT[0], 'y': PIVOT[1]}, 'headTop': head_top}

    shadow = atlas.get(SHADOW)
    for skin_id, body in SKINS.items():
        frames = {}
        for dir_name, (body_dir, _, flip) in DIRS.items():
            for anim, (seq, _, _) in ANIMS.items():
                for i, (bi, _, dx, dy) in enumerate(seq):
                    canvas = blank()
                    place(canvas, shadow, dx, 0, flip)
                    place(canvas, atlas.get(body_frame(body, body_dir, bi)), dx, dy, flip)
                    frames[f'{anim}_{dir_name}_{i}'] = canvas
        write_sheet(OUT_SKIN / skin_id, frames, extra)

    first_bobber = None
    for rod_id, (prefix, *dir_names) in RODS.items():
        frames = {}
        for dir_name, (body_dir, rod_index, flip) in DIRS.items():
            names = atlas.anims[prefix + dir_names[rod_index - 1]]
            for anim, (seq, _, _) in ANIMS.items():
                for i, (bi, ri, dx, dy) in enumerate(seq):
                    canvas = blank()
                    if ri is not None:
                        rdx, rdy = rod_offset(dir_name, bi)
                        place(canvas, atlas.get(names[ri - 1]), dx + rdx, dy + rdy, flip)
                        if dir_name == 'up':
                            # Quay lưng: cần nằm sau thân, xoá phần bị thân che.
                            mask = blank()
                            place(mask, atlas.get(body_frame(SILHOUETTE_BODY, 'up', bi)), dx, dy, flip)
                            canvas[mask[:, :, 3] > 0] = 0
                    frames[f'{anim}_{dir_name}_{i}'] = canvas
        # Cần có phao khác màu thì dùng vị trí phao của cần đầu tiên (cùng dáng dây).
        bobber = bobber_offsets(frames) or first_bobber
        first_bobber = first_bobber or bobber
        write_sheet(OUT_ROD / rod_id, frames, {**extra, 'bobber': bobber} if bobber else extra)


if __name__ == '__main__':
    main()
