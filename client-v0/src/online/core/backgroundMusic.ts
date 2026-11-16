// Nhạc nền: vào game phát ngẫu nhiên 1 bài và lặp lại; sau 30 phút, khi bài đang phát hết thì
// đổi sang bài ngẫu nhiên khác, rồi lại lặp 30 phút như thế.
// File nằm ở public/new resources/music.
import { getAudioSettings, onAudioSettingsChange } from './audioSettings';

const MUSIC_DIR = '/new resources/music/';

export const MUSIC_FILES: readonly string[] = [
  '146 satellites--16af0772.mp3',
  '16 sunsets--2e9be00b.mp3',
  '2AM Secrets--78c5e5c3.mp3',
  '4AM in Kyoto--b1fa94d6.mp3',
  '7pm--2d4f59f7.mp3',
  '8Bit Dreams--201d5dd5.mp3',
  'a crisp winter chill--8d4b8262.mp3',
  'A Full Moon--fbb24c36.mp3',
  'a moment to rest--d8600032.mp3',
  'A Moonlit Stroll--eba73195.mp3',
];

export const MUSIC_SWITCH_MS = 30 * 60 * 1000;
/** Thanh Nhạc nền ở mức 1 thì phát ở âm lượng này; mặc định thanh ở 0.5 (≈ 0.3 như trước). */
const MUSIC_MAX_VOLUME = 0.6;

/** Chọn ngẫu nhiên 1 bài, khác bài đang phát nếu còn bài khác. `random` trong [0, 1). */
export function pickTrack(
  files: readonly string[],
  current: string | null,
  random: () => number = Math.random,
): string | null {
  if (files.length === 0) return null;
  const pool = files.length > 1 ? files.filter((file) => file !== current) : files;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))] ?? null;
}

let audio: HTMLAudioElement | null = null;
let currentTrack: string | null = null;
let trackStartedAt = 0;

function play(): void {
  if (!audio) return;
  audio.play().catch(() => {
    // Trình duyệt chặn tự phát: thử lại ở lần bấm/phím đầu tiên của người chơi.
    const retry = () => {
      window.removeEventListener('pointerdown', retry);
      window.removeEventListener('keydown', retry);
      void audio?.play().catch(() => undefined);
    };
    window.addEventListener('pointerdown', retry, { once: true });
    window.addEventListener('keydown', retry, { once: true });
  });
}

/** Hết bài: đã đủ 30 phút kể từ lúc chọn bài thì đổi bài khác, chưa đủ thì phát lại bài đó. */
export function shouldSwitch(elapsedMs: number): boolean {
  return elapsedMs >= MUSIC_SWITCH_MS;
}

/** Âm lượng thật = thanh Nhạc nền × mức tối đa; kéo về 0 thì tắt hẳn. */
function applyVolume(): void {
  if (audio) audio.volume = getAudioSettings().music * MUSIC_MAX_VOLUME;
}

onAudioSettingsChange(applyVolume);

function playNext(): void {
  const track = pickTrack(MUSIC_FILES, currentTrack);
  if (!track) return;
  currentTrack = track;
  trackStartedAt = Date.now();
  audio?.pause();
  audio = new Audio(encodeURI(MUSIC_DIR + track));
  applyVolume();
  audio.addEventListener('ended', () => {
    if (shouldSwitch(Date.now() - trackStartedAt)) {
      playNext();
    } else if (audio) {
      audio.currentTime = 0;
      play();
    }
  });
  play();
}

/** Bật nhạc nền; gọi lại khi đang phát thì bỏ qua (đăng nhập lại không đổi bài). */
export function startBackgroundMusic(): void {
  if (audio) return;
  playNext();
}

export function stopBackgroundMusic(): void {
  audio?.pause();
  audio = null;
  currentTrack = null;
}
