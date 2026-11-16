// Âm thanh câu cá, ghép từ public/new resources/reference/sounds.csv.
// Phát bằng Web Audio; file nạp lười ở lần phát đầu và giữ lại để lần sau phát ngay.
import { getAudioSettings } from '../core/audioSettings';
import type { Rarity } from '../core/gameplayConfig';

const SOUND_DIR = '/new resources/sound/';

/** Tên âm thanh (cột name của sounds.csv) → file trong public/new resources/sound. */
export const SOUND_FILES = {
  swing: 'Swing--78cab703.wav',
  cast: 'Cast--a92ec6dc.wav',
  castImpact: '1wl25rNkRS7peI3s6817H6uIbrSLApeh25DvEOdYUcwZfn1m--b5d1efcf.wav',
  reel: 'Reel--01887e31.wav',
  reelNotification: '1wl25rNkRS7pPqxZ19VogitnYq4I2hy93NfSel7mbTV6czEZ--c336b2bb.wav',
  minigameHit: '1wl25rNkRS7pGFL5HAyX0auzyTS8t6ohd1xqmlL2JwU3gHkZ--6762418a.wav',
  minigameFail: '1wl25rNkRS7p3lO6hgawZ96jafHtmABdyz0JUMo8DRkcWV7T--0ef5e5d0.wav',
  failPress: '1wl25rNkRS7pDwnavpcVfqke5NjRmozsB3UQ0SaDXnlFucGd--e7072825.wav',
  failPress2: '1wl25rNkRS7pZF5IiOeYbzx7AXMJropQRZmyfn3elw2WUvLj--677b8155.wav',
  win: 'Win--1dc7f8fd.wav',
  woodenClick: '1wl25rNkRS7pyXZ2UaHopZs0FBWl1jYkqSbXLgm4VUEK3A52--a59b00ba.wav',
  commonFish: '1wl25rNkRS7pFvvMnYbuGd9oAvHIXL3s5hyqQpTrOwt4cnie--4df5365a.wav',
  uncommonFish: '1wl25rNkRS7pyXh43YHopZs0FBWl1jYkqSbXLgm4VUEK3A52--91fda04b.wav',
  rareFish: '1wl25rNkRS7pH1QMhYtQRvSTaFZ5cEbfely2Kw3pOLoMxPds--a423910f.wav',
  epicFish: '1wl25rNkRS7pOFeMvyThOqxT3F6LslpzktSevmbw50QcEJPA--a0c8bb23.wav',
  legendaryFish: '1wl25rNkRS7pYtmLGoQhUBolVcAHaW7ft5QTYKIur9v4ONxs--f2d03484.wav',
} as const;

export type SoundName = keyof typeof SOUND_FILES;

const RARITY_SOUND: Record<Rarity, SoundName> = {
  common: 'commonFish',
  uncommon: 'uncommonFish',
  rare: 'rareFish',
  epic: 'epicFish',
  legendary: 'legendaryFish',
};

const VOLUME = 0.6;

let context: AudioContext | null = null;
const buffers = new Map<SoundName, Promise<AudioBuffer | null>>();

function audioContext(): AudioContext | null {
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch (error) {
    console.warn('Không mở được âm thanh', error);
    return null;
  }
}

function load(ctx: AudioContext, name: SoundName): Promise<AudioBuffer | null> {
  let buffer = buffers.get(name);
  if (!buffer) {
    buffer = fetch(encodeURI(SOUND_DIR + SOUND_FILES[name]))
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then((data) => ctx.decodeAudioData(data))
      .catch((error: unknown) => {
        console.warn(`Không nạp được âm thanh ${name}`, error);
        buffers.delete(name);
        return null;
      });
    buffers.set(name, buffer);
  }
  return buffer;
}

/** Phát một âm thanh; lỗi nạp/phát chỉ ghi cảnh báo, không làm hỏng lượt câu. */
export function playSound(name: SoundName, volume = VOLUME): void {
  const level = volume * getAudioSettings().sound;
  if (level <= 0) return;
  const ctx = audioContext();
  if (!ctx) return;
  void load(ctx, name).then((buffer) => {
    if (!buffer) return;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = level;
    source.connect(gain).connect(ctx.destination);
    source.start();
  });
}

/** Âm báo cá cắn câu. */
export function playBiteBeep(): void {
  playSound('reelNotification');
}

/** Âm khi nhận cá: tiếng riêng theo độ hiếm, kèm tiếng thắng. */
export function playCatchSound(rarity: Rarity): void {
  playSound(RARITY_SOUND[rarity]);
  playSound('win', 0.4);
}

/** Nạp sẵn các âm của một lượt câu để lần phát đầu không bị trễ. */
export function preloadFishingSounds(): void {
  const ctx = audioContext();
  if (!ctx) return;
  for (const name of Object.keys(SOUND_FILES) as SoundName[]) void load(ctx, name);
}
