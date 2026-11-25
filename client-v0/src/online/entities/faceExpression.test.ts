import { describe, expect, it } from 'vitest';
import { EXPRESSION_KINDS, expressionPixels } from './faceExpression';

const SKINS = ['skin_02', 'skin_bot_cat_white~orange', 'skin_bot_bear_polar~brown', 'skin_bot_shiba_white', 'skin_bot_turtle_white'];

describe('expressionPixels', () => {
  it('chớp mắt: che mắt gốc rồi vẽ nét ngang 3 điểm ở mỗi mắt', () => {
    const px = expressionPixels('blink', 'skin_02');
    expect(px.filter((p) => p.color === 'fur')).toHaveLength(4);
    const dark = px.filter((p) => p.color === 'dark');
    expect(dark).toHaveLength(6);
    expect(new Set(dark.map((p) => p.y))).toEqual(new Set([52]));
    expect(dark.map((p) => p.x).sort()).toEqual([55, 56, 57, 63, 64, 65]);
  });

  it('mắt cười: vòm ở mỗi mắt và 4 điểm má hồng', () => {
    const px = expressionPixels('smile', 'skin_bot_cat_white~orange');
    const dark = px.filter((p) => p.color === 'dark');
    expect(dark).toHaveLength(6);
    expect(dark.filter((p) => p.y === 51).map((p) => p.x)).toEqual([56, 64]); // đỉnh vòm
    expect(px.filter((p) => p.color === 'blush')).toHaveLength(4);
  });

  it('gấu và shiba dùng vị trí mắt riêng, không có má hồng', () => {
    const bear = expressionPixels('blink', 'skin_bot_bear_polar~brown');
    expect(bear.filter((p) => p.color === 'fur').map((p) => p.y)).toEqual([52, 52, 52, 52]);
    const shiba = expressionPixels('blink', 'skin_bot_shiba_white');
    expect(shiba.filter((p) => p.color === 'fur')).toHaveLength(2);
    expect(expressionPixels('smile', 'skin_bot_bear_polar').some((p) => p.color === 'blush')).toBe(false);
  });

  it('nháy mắt chỉ đổi mắt phải', () => {
    const px = expressionPixels('wink', 'skin_02');
    expect(px.every((p) => p.x >= 62)).toBe(true);
    expect(px.filter((p) => p.color === 'dark')).toHaveLength(3);
  });

  it('mắt trái tim: 6 điểm đỏ mỗi mắt', () => {
    const red = expressionPixels('love', 'skin_02').filter((p) => p.color === 'red');
    expect(red).toHaveLength(12);
  });

  it('ngạc nhiên và ngáp có miệng ở thỏ/mèo, không có ở rùa và gấu', () => {
    const mouth = (kind: 'surprised' | 'yawn', skin: string) =>
      expressionPixels(kind, skin).filter((p) => p.y >= 54 && p.x >= 59 && p.x <= 61 && p.color !== 'blush').length;
    expect(mouth('surprised', 'skin_02')).toBe(4);
    expect(mouth('yawn', 'skin_bot_cat_white~purple')).toBe(6);
    expect(mouth('surprised', 'skin_bot_turtle_white')).toBe(0);
    expect(mouth('yawn', 'skin_bot_bear_polar')).toBe(0);
  });

  it('khóc: giọt nước mắt rơi đổi vị trí theo thời gian', () => {
    const a = expressionPixels('cry', 'skin_02', 0).filter((p) => p.color === 'tear');
    const b = expressionPixels('cry', 'skin_02', 200).filter((p) => p.color === 'tear');
    expect(a).toHaveLength(4);
    expect(b[0]!.y).toBe(a[0]!.y + 1);
  });

  it('giận: hai lông mày xếch phía trên mắt, đầu trong thấp hơn', () => {
    const px = expressionPixels('angry', 'skin_02').filter((p) => p.color === 'dark');
    expect(px).toHaveLength(8);
    expect(Math.max(...px.map((p) => p.y))).toBeLessThan(51); // trên hàng mắt
    expect(px.find((p) => p.x === 57)!.y).toBeGreaterThan(px.find((p) => p.x === 54)!.y); // đầu trong thấp hơn đầu ngoài
  });

  it('mọi biểu cảm trên mọi loài đều có điểm ảnh hợp lệ nằm trong vùng mặt', () => {
    for (const kind of EXPRESSION_KINDS) {
      for (const skin of SKINS) {
        const px = expressionPixels(kind, skin, 100);
        expect(px.length, `${kind} ${skin}`).toBeGreaterThan(0);
        for (const p of px) {
          expect(p.x, `${kind} ${skin}`).toBeGreaterThanOrEqual(52);
          expect(p.x, `${kind} ${skin}`).toBeLessThanOrEqual(68);
          expect(p.y, `${kind} ${skin}`).toBeGreaterThanOrEqual(47);
          expect(p.y, `${kind} ${skin}`).toBeLessThanOrEqual(56);
        }
      }
    }
  });
});
