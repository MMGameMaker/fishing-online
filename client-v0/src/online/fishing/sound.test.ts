import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SOUND_FILES } from './sound';

describe('SOUND_FILES', () => {
  it('trỏ tới file có thật trong public/new resources/sound', () => {
    for (const file of Object.values(SOUND_FILES)) {
      const url = new URL(`../../../public/new resources/sound/${file}`, import.meta.url);
      expect(existsSync(url), file).toBe(true);
    }
  });
});
