import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { NEAR_SEAT_PX, isNearSeat } from '../lake/seatLogic';
import { canStand, nearestStandable, randomSpawn, reachablePoints } from '../lake/walkable';
import mapData from './fishingPierMap.json';
import {
  PIER_SHEETS,
  RIPPLE_ANIMS,
  depthOf,
  isHiddenBehindObject,
  pickRippleSpot,
  type PierMapData,
  type PierObject,
} from './pierMap';

const MAP = mapData as PierMapData;
const atlasFrames = (file: string): Record<string, unknown> => {
  const path = fileURLToPath(
    new URL(`../../../../public/new resources/anim/atlases/${file}.json`, import.meta.url),
  );
  return (JSON.parse(readFileSync(path, 'utf8')) as { frames: Record<string, unknown> }).frames;
};
const frames = {
  pier: atlasFrames(PIER_SHEETS.pier),
  town: atlasFrames(PIER_SHEETS.town),
};

describe('map bến cá dựng lại từ ảnh gốc', () => {
  it('lưới nền 68 × 50 ô, mọi ô trỏ tới frame có trong atlas', () => {
    expect(MAP.width).toBe(68 * MAP.tile);
    expect(MAP.height).toBe(50 * MAP.tile);
    expect(MAP.ground).toHaveLength(50);
    for (const row of MAP.ground) {
      expect(row).toHaveLength(68);
      for (const i of row) expect(frames.pier[MAP.groundFrames[i]!]).toBeDefined();
    }
  });

  it('ô bóng map nằm trong lưới và có trong atlas', () => {
    for (const [c, r, frame] of MAP.shadows) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(68);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(50);
      expect(frames.pier[frame]).toBeDefined();
    }
  });

  it('object dùng frame có thật và chạm vào khung map', () => {
    expect(MAP.objects.length).toBeGreaterThan(100);
    for (const o of MAP.objects) {
      if (!o.image) expect(frames[o.sheet][o.frame], o.frame).toBeDefined();
      expect(o.x + o.w).toBeGreaterThan(0);
      expect(o.y + o.h).toBeGreaterThan(0);
      expect(o.x).toBeLessThan(MAP.width);
      expect(o.y).toBeLessThan(MAP.height);
    }
  });

  it('có đủ các công trình chính của bến cá', () => {
    const names = new Set(MAP.objects.map((o) => o.frame));
    for (const f of [
      'fishing-objects/lightHouse',
      'fishing-objects/fishShop',
      'fishing-objects/smallRaft',
      'main-objects/vendingMachine',
    ]) {
      expect(names.has(f), f).toBe(true);
    }
    expect(MAP.objects.some((o) => o.anim === 'big-boat/boat')).toBe(true);
  });

  it('bờ nước và bóng luôn nằm dưới object', () => {
    const base: PierObject = { sheet: 'pier', frame: '', x: 0, y: 0, w: 10, h: 10, layer: 1 };
    expect(depthOf({ ...base, layer: 0 })).toBeLessThan(depthOf({ ...base, layer: 0.5 }));
    expect(depthOf({ ...base, layer: 0.5, y: 900 })).toBeLessThan(depthOf({ ...base, y: -50 }));
    expect(depthOf({ ...base, layer: 1.2 })).toBeGreaterThan(depthOf(base));
    expect(depthOf({ ...base, layer: 1.2, d: 448 })).toBe(448);
  });
});

describe('animation nước', () => {
  it('chân cọc nằm trong map và đứng ở vùng nước', () => {
    expect(MAP.pillarFlows.length).toBeGreaterThan(20);
    for (const [x, y] of MAP.pillarFlows) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(MAP.width);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(MAP.height);
    }
  });

  it('không có dòng nước chân cọc trên cát (dưới hiên tiệm Marlin, mép bờ, dưới thuyền)', () => {
    // Feedback 2026-11-13: các điểm này trong ảnh gốc là cát/bờ/thuyền, vẽ dòng nước thành vệt xanh trên cát.
    const onSand = [
      [816, 220],
      [774, 221],
      [459, 120],
      [349, 745],
    ];
    for (const [x, y] of onSand) {
      expect(MAP.pillarFlows.some(([fx, fy]) => fx === x && fy === y)).toBe(false);
    }
    const underShack = MAP.pillarFlows.filter(
      ([x, y]) => x >= 750 && x <= 880 && y >= 200 && y <= 240,
    );
    expect(underShack).toEqual([]);
  });

  it('gợn sóng luôn nằm gọn trong ô nước trống', () => {
    const open = new Set(MAP.openWater.map(([c, r]) => `${c},${r}`));
    let seed = 1;
    const rand = (): number => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (const anim of RIPPLE_ANIMS) {
      for (let i = 0; i < 200; i++) {
        const spot = pickRippleSpot(MAP.openWater, anim, MAP.tile, rand);
        expect(spot, anim.key).not.toBeNull();
        for (const [px, py] of [
          [spot!.x, spot!.y],
          [spot!.x + anim.w - 1, spot!.y + anim.h - 1],
        ] as const) {
          expect(open.has(`${Math.floor(px / MAP.tile)},${Math.floor(py / MAP.tile)}`)).toBe(true);
        }
      }
    }
  });

  it('không có ô nước trống thì không đặt gợn sóng', () => {
    expect(pickRippleSpot([], { w: 4, h: 4 }, 16, Math.random)).toBeNull();
  });
});

describe('map chơi được của pier', () => {
  const lake = MAP.lake;
  const FACING: Record<string, [number, number]> = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0],
  };

  it('lưới đi được khớp kích thước map và spawn đứng được', () => {
    expect(lake.walkableRows).toHaveLength(lake.heightTiles);
    expect(lake.widthTiles * lake.tileSize).toBe(MAP.width);
    expect(canStand(lake, lake.spawn.x, lake.spawn.y)).toBe(true);
  });

  it('NPC chặn chỗ đứng và có chỗ đứng cạnh trong tầm bấm F (2026-11-20)', () => {
    expect(lake.npcs?.map((npc) => [npc.npcId, npc.skinId, npc.action])).toEqual([
      ['codex-octopus', 'npc_octopus', 'codex'],
      ['sell-fox', 'npc_fox', 'sellFish'],
      ['rank-board', 'npc_board', 'leaderboard'],
    ]);
    for (const npc of lake.npcs ?? []) {
      expect(canStand(lake, npc.x, npc.y), npc.npcId).toBe(false);
      // Có chỗ đứng cách chân NPC tối đa 24px (tầm NEAR_NPC_PX = 32 ở LakeScene).
      const spots = [-24, -16, -12, 12, 16, 24].flatMap((d) => [
        [npc.x + d, npc.y],
        [npc.x, npc.y + d],
      ]);
      expect(spots.some(([x, y]) => canStand(lake, x!, y!)), npc.npcId).toBe(true);
    }
  });

  it('điểm vào game ngẫu nhiên phủ phần lớn map và luôn đứng được', () => {
    const points = reachablePoints(lake);
    // Map pier rộng: số ô đi tới được từ spawn phải lớn (không bị kẹt trong một góc nhỏ).
    expect(points.length).toBeGreaterThan(2000);
    for (let i = 0; i < 50; i++) {
      const p = randomSpawn(lake);
      expect(canStand(lake, p.x, p.y)).toBe(true);
    }
  });

  it('điểm vào game không sát mép map và không khuất sau vật thể', () => {
    const width = lake.widthTiles * lake.tileSize;
    const height = lake.heightTiles * lake.tileSize;
    const hidden = (x: number, y: number) => isHiddenBehindObject(MAP.objects, x, y);
    // Có điểm đi được bị khuất (hải đăng, tán cây) để phép kiểm có ý nghĩa.
    expect(reachablePoints(lake).some((p) => hidden(p.x, p.y))).toBe(true);
    for (let i = 0; i < 200; i++) {
      const p = randomSpawn(lake, Math.random, (x, y) => !hidden(x, y));
      expect(p.x).toBeGreaterThanOrEqual(80);
      expect(p.y).toBeGreaterThanOrEqual(80);
      expect(p.x).toBeLessThanOrEqual(width - 80);
      expect(p.y).toBeLessThanOrEqual(height - 80);
      expect(hidden(p.x, p.y)).toBe(false);
    }
  }, 30_000); // duyệt hàng nghìn điểm × mọi object (cả bóng cây): chậm hơn 5 giây mặc định khi chạy cả bộ test

  it('mỗi ghế có chỗ đứng trong tầm ngồi và phao rơi xuống nước', () => {
    expect(lake.seats).toHaveLength(38);
    for (const seat of lake.seats) {
      // Ghế là vật cản: rời ghế thì bước sang chỗ đứng được gần nhất, không quá 24px.
      const stand = nearestStandable(lake, seat.x, seat.y, 24);
      expect(stand, `${seat.seatId} có chỗ đứng khi rời ghế`).not.toBeNull();
      let reachable = false;
      for (let dy = -NEAR_SEAT_PX; dy <= NEAR_SEAT_PX && !reachable; dy += 4) {
        for (let dx = -NEAR_SEAT_PX; dx <= NEAR_SEAT_PX && !reachable; dx += 4) {
          reachable =
            isNearSeat(seat.x + dx, seat.y + dy, seat) && canStand(lake, seat.x + dx, seat.y + dy);
        }
      }
      expect(reachable, seat.seatId).toBe(true);
      const [vx, vy] = FACING[seat.facing]!;
      const bx = seat.x + vx * 48;
      const by = seat.y + vy * 48;
      const row = lake.walkableRows[Math.floor(by / lake.tileSize)]!;
      expect(row[Math.floor(bx / lake.tileSize)], `${seat.seatId} phao`).toBe('0');
    }
  });
});

describe('va chạm map pier', () => {
  const lake = MAP.lake;
  const objectsNamed = (frame: string): PierObject[] =>
    MAP.objects.filter((o) => o.frame === frame);

  /**
   * Đi xuyên qua được (yêu cầu 2026-11-18): ghế đẩu quanh bàn. Bốn ghế dài cạnh nước có chỗ câu từng đi xuyên qua
   * được nhưng đã có va chạm (feedback 2026-11-19).
   */
  const passThrough = (o: PierObject): boolean =>
    o.frame === 'main-objects/stool' &&
    !lake.seats.some((s) => s.x >= o.x && s.x <= o.x + o.w && s.y >= o.y && s.y <= (o.by ?? 0) + 4);

  it('đi xuyên qua ghế đẩu quanh bàn', () => {
    const open = MAP.objects.filter(passThrough);
    expect(open).toHaveLength(20);
    for (const o of open) {
      const x = o.x + o.w / 2;
      const y = (o.by ?? o.y + o.h) - 3;
      expect(canStand(lake, x, y), `${o.frame} @${o.x},${o.y}`).toBe(true);
    }
  });

  it('ghế dài có chỗ câu (4 ghế dài cạnh nước) chặn đường đi', () => {
    const benches = MAP.objects.filter(
      (o) =>
        /^main-objects\/(frontBench|leftBench|rightBench)$/.test(o.frame) &&
        lake.seats.some(
          (s) => s.x >= o.x && s.x <= o.x + o.w && s.y >= o.y && s.y <= (o.by ?? 0) + 4,
        ),
    );
    expect(benches).toHaveLength(4);
    for (const o of benches) {
      // Mọi điểm dọc thân ghế (cách mép 6px) đều không đứng được.
      for (let dy = 8; dy < (o.by ?? o.y + o.h) - o.y - 2; dy += 8) {
        expect(canStand(lake, o.x + o.w / 2, o.y + dy + 6), `${o.frame} @${o.x},${o.y}+${dy}`).toBe(
          false,
        );
      }
    }
  });

  it('không đứng được giữa ghế đẩu câu, ghế băng khác, bàn, thùng, máy bán nước', () => {
    const frames = [
      'main-objects/stool',
      'main-objects/frontBench',
      'main-objects/leftBench',
      'main-objects/rightBench',
      'main-objects/smallTable',
      'main-objects/picnicTableMiddle',
      'fishing-objects/boxClosed',
      'fishing-objects/tripleBox',
      'main-objects/vendingMachine',
    ];
    for (const frame of frames) {
      const list = objectsNamed(frame);
      expect(list.length, frame).toBeGreaterThan(0);
      for (const o of list) {
        if (passThrough(o)) continue;
        // Tâm phần dưới của hình (chỗ vật chạm đất).
        const bottom = o.by ?? o.y + o.h;
        const x = o.x + o.w / 2;
        const y = bottom - 3;
        expect(canStand(lake, x, y), `${frame} @${o.x},${o.y}`).toBe(false);
      }
    }
  });

  it('không đứng được trên mặt nước trống', () => {
    for (const [c, r] of MAP.openWater) {
      const x = c * MAP.tile + MAP.tile / 2;
      const y = r * MAP.tile + MAP.tile - 1;
      expect(canStand(lake, x, y), `nước ${c},${r}`).toBe(false);
    }
  });
});

describe('chồng thùng', () => {
  it('thùng đỉnh vẽ trên các thùng bên dưới nhưng dưới nhân vật đứng trước chồng', () => {
    const tops = MAP.objects.filter((o) => o.layer > 1);
    // Chồng thùng duy nhất đã bị xoá để nhường chỗ cho bục xếp hạng (2026-11-21); còn chồng nào thì vẫn kiểm.
    for (const top of tops) {
      const under = MAP.objects.filter(
        (o) =>
          o.layer === 1 &&
          o.frame.includes('box') &&
          o.x < top.x + top.w &&
          o.x + o.w > top.x &&
          (o.by ?? 0) > (top.by ?? 0),
      );
      for (const o of under) expect(depthOf(top)).toBeGreaterThan(depthOf(o));
      // Nhân vật đứng trước chồng thùng có chân thấp hơn đáy thấp nhất; vùng chặn không cho đứng lấn vào.
      const lowest = Math.max(...under.map((o) => o.by ?? 0), top.by ?? 0);
      expect(depthOf(top)).toBeLessThanOrEqual(lowest + 1);
    }
  });
});

describe('ghế câu của pier', () => {
  const onObject = (seat: { x: number; y: number }, frames: RegExp): PierObject | undefined =>
    MAP.objects.find(
      (o) =>
        frames.test(o.frame) &&
        seat.x >= o.x &&
        seat.x <= o.x + o.w &&
        seat.y >= o.y &&
        seat.y <= (o.by ?? o.y + o.h) + 4,
    );

  it('ghế câu nằm trên ghế đẩu, hoặc 2 chỗ trên mỗi ghế dài cạnh nước (yêu cầu 2026-11-18)', () => {
    const perBench = new Map<PierObject, number>();
    for (const seat of MAP.lake.seats) {
      const object = onObject(seat, /^main-objects\/(stool|frontBench|leftBench|rightBench)$/);
      expect(object, seat.seatId).toBeDefined();
      if (object && object.frame !== 'main-objects/stool') {
        perBench.set(object, (perBench.get(object) ?? 0) + 1);
      }
    }
    expect([...perBench.values()]).toEqual([2, 2, 2, 2]);
  });

  it('số ghế bằng số ghế Server chạy cho pier (Lake:SeatCount = 38)', () => {
    expect(MAP.lake.seats.length).toBe(38);
    expect(new Set(MAP.lake.seats.map((s) => s.seatId)).size).toBe(38);
  });
});

describe('chỗ ngồi chơi của pier (yêu cầu 2026-11-18)', () => {
  const rest = MAP.lake.restSeats ?? [];

  it('30 chỗ (Lake:RestSeatCount = 30): 20 ghế đẩu quanh bàn + 2 bàn picnic × 2 băng × 2 chỗ + 2 chỗ ghế băng cạnh máy bán nước', () => {
    expect(rest).toHaveLength(30);
    expect(new Set(rest.map((s) => s.restSeatId)).size).toBe(30);
    const stools = rest.filter((s) =>
      MAP.objects.some(
        (o) =>
          o.frame === 'main-objects/stool' &&
          s.x >= o.x &&
          s.x <= o.x + o.w &&
          s.y >= o.y &&
          s.y <= (o.by ?? 0) + 4,
      ),
    );
    expect(stools).toHaveLength(20);
  });

  it('mỗi chỗ có chỗ đứng trong tầm bấm F, quay mặt vào bàn, không trùng ghế câu', () => {
    for (const seat of rest) {
      let reachable = false;
      for (let dy = -NEAR_SEAT_PX; dy <= NEAR_SEAT_PX && !reachable; dy += 2) {
        for (let dx = -NEAR_SEAT_PX; dx <= NEAR_SEAT_PX && !reachable; dx += 2) {
          reachable =
            isNearSeat(seat.x + dx, seat.y + dy, seat) &&
            canStand(MAP.lake, seat.x + dx, seat.y + dy);
        }
      }
      expect(reachable, seat.restSeatId).toBe(true);
      expect(['left', 'right', 'down'], seat.restSeatId).toContain(seat.facing);
      expect(
        MAP.lake.seats.some((s) => Math.hypot(s.x - seat.x, s.y - seat.y) < 8),
        seat.restSeatId,
      ).toBe(false);
    }
  });

  it('ghế dài: người ngồi nửa dưới vẽ trên người ngồi nửa trên, cả hai trên ghế', () => {
    const benches = [...MAP.lake.seats, ...rest].filter((s) => s.depth !== undefined);
    expect(benches.length).toBe(12);
    for (const seat of benches) expect(seat.depth!).toBeGreaterThan(seat.y);
  });
});

// Bản sao map cho bot ở Server phải khớp map Client, nếu không bot ngồi/đi sai chỗ (feedback 2026-11-19).
describe('bản sao map pier cho bot ở Server', () => {
  const botMap = JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL(
          '../../../../../server/FishingOnline.Api/Modules/Bots/pier-map.json',
          import.meta.url,
        ),
      ),
      'utf8',
    ),
  ) as {
    mapVersion: string;
    walkableRows: string[];
    spawn: unknown;
    moveRules: unknown;
    seats: { seatId: string; x: number; y: number; facing: string }[];
    restSeats: unknown[];
  };

  it('khớp lưới đi được, spawn, luật di chuyển và chỗ ngồi chơi', () => {
    expect(botMap.mapVersion).toBe(MAP.lake.mapVersion);
    expect(botMap.walkableRows).toEqual(MAP.lake.walkableRows);
    expect(botMap.spawn).toEqual(MAP.lake.spawn);
    expect(botMap.moveRules).toEqual(MAP.lake.moveRules);
    expect(botMap.restSeats).toEqual(MAP.lake.restSeats);
  });

  it('khớp từng ghế câu (vị trí, hướng, ghế dài, độ sâu)', () => {
    expect(botMap.seats).toEqual(MAP.lake.seats.map((seat) => ({ ...seat, number: undefined })));
  });
});
