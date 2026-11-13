"""Xuất ảnh 9 loài cá của game từ atlas trong public/new resources/anim/atlases.

Ra public/assets/fish/<speciesId>.png (cắt sát, kích thước gốc pixel art). Client dùng cho popup câu được
cá, cửa hàng và túi đồ. Đổi ảnh một loài: sửa bảng FISH rồi chạy lại `python tools/export_fish_art.py`.
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ATLASES = ROOT / 'public' / 'new resources' / 'anim' / 'atlases'
OUT = ROOT / 'public' / 'assets' / 'fish'

# speciesId của game → frame trong atlas (người dùng duyệt 2026-11-13). 6 loài khớp tên; Carp, Trout,
# Moonfin không có ảnh cùng tên nên tạm chọn Bluegills, Arctic Char, Marlin (đổi tại đây nếu GD chọn khác).
FISH = {
    'minnow': 'swamp-fish/Minnow',
    'perch': 'swamp-fish/Yellow Perch',
    'carp': 'swamp-fish/Bluegills',
    'trout': 'arctic-fish/Arctic Char',
    'bass': 'fish/Bass',
    'goldcarp': 'fish/Golden Goldfish',
    'puffer': 'fish/Puffer Fish',
    'koi': 'fish/Koi Carp',
    'moonfin': 'fish/Marlin',
}


def load_frames() -> dict[str, tuple[dict, Image.Image]]:
    frames: dict[str, tuple[dict, Image.Image]] = {}
    for path in sorted(ATLASES.glob('sheet-fish-*.json')):
        data = json.loads(path.read_text(encoding='utf-8'))
        image = Image.open(ATLASES / data['meta']['image']).convert('RGBA')
        for name, frame in data['frames'].items():
            frames[name] = (frame, image)
    return frames


def crop(frame: dict, image: Image.Image) -> Image.Image:
    f = frame['frame']
    if frame.get('rotated'):
        part = image.crop((f['x'], f['y'], f['x'] + f['h'], f['y'] + f['w'])).rotate(90, expand=True)
    else:
        part = image.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))
    return part.crop(part.getbbox())


def main() -> None:
    frames = load_frames()
    OUT.mkdir(parents=True, exist_ok=True)
    for species_id, frame_name in FISH.items():
        if frame_name not in frames:
            raise SystemExit(f'Không có frame {frame_name} cho {species_id}')
        art = crop(*frames[frame_name])
        art.save(OUT / f'{species_id}.png', optimize=True)
        print(species_id, frame_name, art.size)


if __name__ == '__main__':
    main()
