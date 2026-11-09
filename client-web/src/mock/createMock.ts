import configJson from '@fixtures/gameplay-config.v0.json';
import { isGameplayConfig } from '../core/gameplayConfig';
import { isErrorCode } from '../net/contractGuards';
import type { LakeMap } from '../scenes/lake/walkable';
import { mountDevOverlay } from './devOverlay';
import { MockBackend } from './MockBackend';

/** Dựng mock cho trình duyệt; `?mockError=SEAT_TAKEN` bật lỗi giả. */
export function createMock(map: LakeMap): MockBackend {
  if (!isGameplayConfig(configJson)) throw new Error('gameplay-config không đúng contract');
  const requested = new URLSearchParams(window.location.search).get('mockError');
  const forcedError = isErrorCode(requested) ? requested : null;
  const mock = new MockBackend({ config: configJson, map, seed: Date.now() >>> 0, forcedError });
  mock.startRealtime();
  mountDevOverlay(mock, forcedError);
  return mock;
}
