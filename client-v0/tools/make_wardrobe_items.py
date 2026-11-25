"""Sinh tools/wardrobe-items.json: danh mục trang phục bán ở Cửa hàng (mũ, áo, quần và nguyên bộ), 300 Gold mỗi món (yêu cầu 2026-11-25).

Nguồn danh sách: kết quả kiểm duyệt bằng mắt trong docs/work/W02-trang-phuc-npc-tho.md (40 mũ chọn tay, 165 áo, 86 quần đã bỏ
`turtle-floaty`) và 64 bộ liền (outfit: 55 dùng thường + 9 hóa trang). Tên tiếng Việt viết tay theo bảng dưới. Chạy lại khi đổi danh sách:

    python tools/make_wardrobe_items.py

File JSON dùng cho: tools/bake_wardrobe.mjs (bake art), Server (server/FishingOnline.Api/Modules/Wardrobe/wardrobe-items.json,
sao chép nguyên), Client mock.
"""
import collections
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
ATLAS = ROOT / 'public' / 'new resources' / 'anim' / 'atlases'

COLORS = {
    'black': 'đen', 'blue': 'xanh dương', 'green': 'xanh lá', 'red': 'đỏ', 'pink': 'hồng', 'orange': 'cam', 'purple': 'tím',
    'teal': 'xanh ngọc', 'yellow': 'vàng', 'grey': 'xám', 'gray': 'xám', 'white': 'trắng', 'brown': 'nâu', 'beige': 'be',
    'bege': 'be', 'cyan': 'lam', 'lavender': 'oải hương', 'light': 'nhạt', 'dark': 'đậm', 'aqua': 'xanh nước',
    'marine': 'xanh hải quân', 'rose': 'hồng đào', 'albino': 'trắng', 'carrot': 'cà rốt', 'autumn': 'thu',
    'deep-sea': 'xanh biển sâu', 'greeny': 'xanh lục', 'pinkysh': 'hồng nhạt', 'diamond': 'kim cương', 'ob': 'cam nâu',
    'light-blue': 'xanh nhạt', 'light-orange': 'cam nhạt', 'light-pink': 'hồng nhạt', 'blackgreen': 'đen xanh lá',
    'greenblack': 'xanh lá đen',
}

TOP = {
    'astronaut-vest': 'Áo vest phi hành gia', 'barista': 'Tạp dề pha chế', 'bege-stamped-shirt': 'Áo in họa tiết be',
    'berry-croptop': 'Áo croptop dâu', 'black-jean-jacket': 'Áo khoác jean đen', 'blue-croptop': 'Áo croptop xanh',
    'blue-jean-jacket': 'Áo khoác jean xanh', 'body-tattoo': 'Hình xăm', 'boho-pattern': 'Áo họa tiết boho',
    'cat-sweatshirt': 'Áo nỉ mèo', 'classic-student-uniform': 'Đồng phục học sinh', 'cloud-sweater': 'Áo len mây',
    'cool-beach-shirt': 'Áo sơ mi đi biển', 'cute-sweater': 'Áo len dễ thương', 'dapper-vest': 'Áo gi-lê lịch lãm',
    'darkblue-turtleneck': 'Áo cổ lọ xanh đậm', 'doctors-labcoat': 'Áo blouse bác sĩ', 'eclipse-stamped-shirt': 'Áo in nhật thực',
    'fall-turtleneck': 'Áo cổ lọ mùa thu', 'fisherman-cargo-vest': 'Áo gi-lê ngư dân', 'floral-shirt': 'Áo sơ mi hoa',
    'fur-jacket': 'Áo khoác lông', 'graduation-gown': 'Áo cử nhân', 'green-sleeveless-shirt': 'Áo ba lỗ',
    'heart-cropped': 'Áo croptop tim', 'hoodie': 'Áo hoodie', 'kimono': 'Kimono', 'leaf-shirt': 'Áo lá', 'lemon-shirt': 'Áo chanh',
    'light-blue-cardigan': 'Áo cardigan xanh nhạt', 'lofi-baggy-hoodie': 'Áo hoodie lofi rộng',
    'long-sleeved-croptop': 'Áo croptop tay dài', 'longsleeve': 'Áo tay dài', 'moon-stamped-shirt': 'Áo in trăng',
    'nurse-labcoat': 'Áo blouse y tá', 'open-flannel': 'Áo flannel khoác ngoài', 'painter': 'Yếm họa sĩ',
    'pastel-bikini': 'Bikini pastel', 'pastel-goth-longsleeve': 'Áo tay dài goth pastel',
    'patterned-cardigan': 'Áo cardigan họa tiết', 'patterned-long-sleeve': 'Áo tay dài họa tiết', 'puffer-coat': 'Áo phao',
    'puffer-vest': 'Áo phao ghi-lê', 'safari-suit': 'Đồ safari', 'sailor-shirt': 'Áo thủy thủ', 'scout-shirt': 'Áo hướng đạo',
    'shark-camo-hoodie': 'Áo hoodie cá mập rằn ri', 'shirt': 'Áo thun', 'simple-bikini': 'Bikini đơn giản',
    'stamped-shirt': 'Áo in hình', 'star-patterned-shirt': 'Áo họa tiết sao', 'starry-sky-hoodie': 'Áo hoodie bầu trời sao',
    'tangzhuang-coat': 'Áo Đường trang', 'tech-cloak': 'Áo choàng công nghệ', 'tenants-uniform': 'Đồng phục thợ',
    'trench-coat': 'Áo măng-tô', 'tuxedo': 'Áo tuxedo', 'urban-jacket-1': 'Áo khoác đường phố 1',
    'urban-jacket-2': 'Áo khoác đường phố 2', 'wavy-shirt': 'Áo họa tiết sóng', 'winter-sweater': 'Áo len mùa đông',
    'wool-hoodie': 'Áo hoodie len',
}

LEG = {
    'astronaut-pants': 'Quần phi hành gia', 'baggy1': 'Quần ống rộng 1', 'baggy2': 'Quần ống rộng 2', 'baggy3': 'Quần ống rộng 3',
    'beach-shorts': 'Quần short đi biển', 'black-sport-shorts': 'Quần short thể thao đen', 'blue-beach-pants': 'Quần đi biển xanh',
    'brown-skirt': 'Chân váy nâu', 'cargo-pants': 'Quần túi hộp', 'denim-pants-with-sneakers': 'Quần jean kèm giày',
    'goth-mini-jeans': 'Quần jean mini goth', 'green-parachute-pants': 'Quần dù xanh lá', 'kievan-rus-pants': 'Quần Kievan Rus',
    'kimono-linen': 'Quần kimono lanh', 'leaf-pants': 'Quần lá', 'long-floral-skirt': 'Chân váy hoa dài',
    'mermaid-questionMark-jeans': 'Quần jean nàng tiên cá', 'moss-cargo-shorts': 'Quần short túi hộp rêu',
    'pink-beach-pants': 'Quần đi biển hồng', 'pink-skirt': 'Chân váy hồng', 'red-sport-shorts': 'Quần short thể thao đỏ',
    'safari-pants': 'Quần safari', 'side-skirt': 'Chân váy xẻ', 'sweatpants1': 'Quần nỉ 1', 'sweatpants2': 'Quần nỉ 2',
    'sweatpants3': 'Quần nỉ 3', 'swim-trunks': 'Quần bơi', 'tenants-pants': 'Quần thợ', 'yellow-skirt': 'Chân váy vàng',
}

HAT = {
    'earmuffs': 'Bịt tai', 'headphones': 'Tai nghe', 'headphones-blackgreen': 'Tai nghe đen xanh lá',
    'headphones-cyan': 'Tai nghe lam', 'headphones-greenblack': 'Tai nghe xanh lá đen', 'red-white-headphones': 'Tai nghe đỏ trắng',
    'pink-bow': 'Nơ hồng', 'pink-bow-blue': 'Nơ xanh dương', 'pink-bow-brown': 'Nơ nâu', 'pink-bow-green': 'Nơ xanh lá',
    'pink-bow-red': 'Nơ đỏ', 'demon-horns': 'Sừng quỷ', 'demon-horns-albino': 'Sừng quỷ trắng',
    'demon-horns-blue': 'Sừng quỷ xanh dương', 'demon-horns-gray': 'Sừng quỷ xám', 'demon-horns-green': 'Sừng quỷ xanh lá',
    'demon-horns-pink': 'Sừng quỷ hồng', 'egg-on-head': 'Trứng ốp la', 'egg-on-head-blue': 'Trứng ốp la xanh',
    'egg-on-head-pink': 'Trứng ốp la hồng', 'trev-bandana': 'Khăn bịt đầu đỏ', 'trev-bandana-blue': 'Khăn bịt đầu xanh dương',
    'trev-bandana-grey': 'Khăn bịt đầu xám', 'trev-bandana-purple': 'Khăn bịt đầu tím', 'silly-studying-headband': 'Băng đô học bài',
    'cap': 'Mũ lưỡi trai', 'cap-orb': 'Mũ lưỡi trai cầu', 'cap-pink': 'Mũ lưỡi trai hồng', 'black-beret': 'Mũ nồi đen',
    'black-beret-cyan': 'Mũ nồi lam', 'black-beret-red': 'Mũ nồi đỏ', 'flower-crown': 'Vòng hoa', 'flower-crown-blue': 'Vòng hoa xanh',
    'flower-crown-rose': 'Vòng hoa hồng đào', 'nurse-cap': 'Mũ y tá', 'lederhosen-hat': 'Mũ Bavaria', 'lederhosen-hat-bege': 'Mũ Bavaria be',
    'lederhosen-hat-teal': 'Mũ Bavaria xanh ngọc', 'doctor-reflector': 'Gương bác sĩ', 'moon-earrings': 'Hoa tai trăng',
}


SET = {
    'clown-trousers': 'Quần yếm chú hề', 'cultist-cloak': 'Áo choàng tà giáo', 'no-earholes-cultist-cloak': 'Áo choàng tà giáo kín',
    'elvis-jumpsuit': 'Bộ liền Elvis', 'fall-dress': 'Váy mùa thu', 'farmer-overall': 'Yếm nông dân',
    'fishing-overall-1': 'Yếm câu cá', 'fishing-overall-2': 'Yếm câu cá 2', 'flamenco-dress': 'Váy flamenco',
    'fluffy-hoodie': 'Áo hoodie bông xù', 'forg-costume': 'Đồ hóa ếch', 'gardening-overall': 'Yếm làm vườn',
    'ghost-costume': 'Đồ hóa ma', 'guitar-band': 'Bộ ban nhạc guitar', 'hanfu': 'Hán phục', 'lederhosen-overall': 'Yếm Bavaria',
    'mary-dress': 'Váy Mary', 'metal-band': 'Bộ ban nhạc metal', 'mint-dress': 'Váy bạc hà', 'mummy-wraps': 'Đồ xác ướp',
    'pretty-pink-dress': 'Váy hồng xinh', 'red-dress': 'Váy đỏ', 'santa-outfit': 'Đồ ông già Noel',
    'skeleton-costume': 'Đồ bộ xương', 'strawberry-dress': 'Váy dâu tây', 'swimsuit': 'Đồ bơi',
    'tangzhuang-dress': 'Váy Đường trang', 'turtle-ghost-costume': 'Đồ ma rùa', 'winter-dress': 'Váy mùa đông',
    'yellow-raincoat': 'Áo mưa vàng', 'yellow-raincoat-bpy': 'Áo mưa vàng xanh hồng',
}
# Bộ liền bán (64): dùng chung được cho thỏ, NPC và mọi thân bot (kiểm duyệt bằng mắt, xem docs/work/W02-trang-phuc-npc-tho.md). Đã bỏ
# mermaid x3 (tóc nàng tiên cá vươn rộng nhìn từ sau như vành mũ khổng lồ) và big-ears-forg-costume (trùng forg-costume).
SET_ITEMS = [
    'clown-trousers',
    'clown-trousers-blue',
    'clown-trousers-orange',
    'cultist-cloak',
    'cultist-cloak-green',
    'cultist-cloak-teal',
    'elvis-jumpsuit',
    'fall-dress',
    'fall-dress-black',
    'fall-dress-teal',
    'farmer-overall',
    'fishing-overall-1',
    'fishing-overall-1-light',
    'fishing-overall-1-orange',
    'fishing-overall-2',
    'flamenco-dress',
    'flamenco-dress-black',
    'flamenco-dress-carrot',
    'flamenco-dress-pink',
    'fluffy-hoodie',
    'fluffy-hoodie-green',
    'fluffy-hoodie-lavender',
    'forg-costume',
    'gardening-overall',
    'ghost-costume',
    'guitar-band',
    'guitar-band-pink',
    'guitar-band-teal',
    'hanfu',
    'hanfu-blue',
    'lederhosen-overall',
    'lederhosen-overall-bege',
    'lederhosen-overall-teal',
    'mary-dress',
    'metal-band',
    'metal-band-yellow',
    'mint-dress',
    'mint-dress-blue',
    'mint-dress-pink',
    'mummy-wraps',
    'no-earholes-cultist-cloak',
    'no-earholes-cultist-cloak-green',
    'no-earholes-cultist-cloak-teal',
    'pretty-pink-dress',
    'pretty-pink-dress-black',
    'pretty-pink-dress-blue',
    'red-dress',
    'santa-outfit',
    'skeleton-costume',
    'strawberry-dress',
    'swimsuit',
    'swimsuit-blue',
    'swimsuit-green',
    'swimsuit-pink',
    'swimsuit-red',
    'swimsuit-yellow',
    'tangzhuang-dress',
    'tangzhuang-dress-black',
    'tangzhuang-dress-blue',
    'turtle-ghost-costume',
    'winter-dress',
    'yellow-raincoat',
    'yellow-raincoat-bpy',
    'yellow-raincoat-purple',
]


def split_color(name):
    parts = name.split('-')
    for k in (3, 2, 1):
        if len(parts) > k:
            suffix = '-'.join(parts[-k:])
            if suffix in COLORS:
                return '-'.join(parts[:-k]), suffix
    return name, ''


def vn(table, name):
    if name in table:
        return table[name]
    base, color = split_color(name)
    assert base in table, f'Chưa có tên tiếng Việt cho {name}'
    return f'{table[base]} {COLORS[color]}'


def atlas_items(slot):
    found = set()
    for i in range(3):
        data = json.loads((ATLAS / f'sheet-cosmetics-{i}.json').read_text(encoding='utf-8'))
        frames = data.get('frames') or data['textures'][0]['frames']
        names = frames.keys() if isinstance(frames, dict) else [f['filename'] for f in frames]
        for name in names:
            parts = name.split('/')
            if parts[0] == 'traits' and parts[1] == slot:
                found.add(parts[2])
    return found


def main():
    tops = atlas_items('torso')
    legs = atlas_items('legs') - {'turtle-floaty'}
    hats = set(HAT)
    assert hats <= atlas_items('hat'), 'Có mũ không tồn tại trong atlas'
    items = []
    for name in sorted(hats):
        items.append({'id': f'hat_{name}', 'slot': 'hat', 'atlas': name, 'name': HAT[name]})
    for name in sorted(tops):
        items.append({'id': f'top_{name}', 'slot': 'top', 'atlas': name, 'name': vn(TOP, name)})
    for name in sorted(legs):
        items.append({'id': f'legs_{name}', 'slot': 'legs', 'atlas': name, 'name': vn(LEG, name)})
    # Nguyên bộ: gồm cả bộ hóa trang trùm đầu (ếch, ma, áo choàng).
    assert set(SET_ITEMS) <= atlas_items('outfit'), 'Có bộ liền không tồn tại trong atlas'
    for name in sorted(SET_ITEMS):
        items.append({'id': f'set_{name}', 'slot': 'set', 'atlas': name, 'name': vn(SET, name)})
    dup = [k for k, v in collections.Counter((i['slot'], i['name']) for i in items).items() if v > 1]
    print(len(items), 'món; trùng tên cùng loại:', dup)
    (ROOT / 'tools' / 'wardrobe-items.json').write_text(
        json.dumps({'priceGold': 300, 'items': items}, ensure_ascii=False, indent=1), encoding='utf-8')


main()
