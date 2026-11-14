import configJson from '@fixtures/gameplay-config.v0.json';
import { isGameplayConfig } from '../core/gameplayConfig';
import { isErrorCode } from '../net/contractGuards';
import type { LakeMap } from '../scenes/lake/walkable';
import { mountDevOverlay } from './devOverlay';
import { MockBackend } from './MockBackend';

/** Dựng mock cho trình duyệt; `?mockError=SEAT_TAKEN` bật lỗi giả, `?mockPing=150` giả độ trễ. */
export function createMock(
  map: LakeMap,
  botCount?: number,
  extra: { fishingBots?: boolean } = {},
): MockBackend {
  if (!isGameplayConfig(configJson)) throw new Error('gameplay-config không đúng contract');
  const query = new URLSearchParams(window.location.search);
  const requested = query.get('mockError');
  const forcedError = isErrorCode(requested) ? requested : null;
  const latencyMs = Math.max(0, Number(query.get('mockPing') ?? 0)) || 0;
  const mock = new MockBackend({
    config: configJson,
    map,
    seed: Date.now() >>> 0,
    forcedError,
    latencyMs,
    botCount,
    fishingBots: extra.fishingBots,
  });
  mock.startRealtime();
  mountDevOverlay(mock, forcedError);
  return mock;
}
