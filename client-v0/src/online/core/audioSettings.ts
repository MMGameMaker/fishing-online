// Cài đặt âm thanh của người chơi (Âm thanh = tiếng câu cá, Nhạc nền), lưu localStorage.
// Giá trị 0..1; kéo về 0 là tắt hẳn.
export interface AudioSettings {
  sound: number;
  music: number;
}

const STORAGE_KEY = 'fishing.audioSettings';
const DEFAULTS: AudioSettings = { sound: 1, music: 0.5 };

export function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

/** Đọc chuỗi đã lưu; hỏng hoặc thiếu trường thì dùng mặc định. */
export function parseAudioSettings(raw: string | null): AudioSettings {
  if (!raw) return { ...DEFAULTS };
  try {
    const data = JSON.parse(raw) as Partial<Record<keyof AudioSettings, unknown>>;
    return {
      sound: typeof data.sound === 'number' ? clamp01(data.sound) : DEFAULTS.sound,
      music: typeof data.music === 'number' ? clamp01(data.music) : DEFAULTS.music,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function load(): AudioSettings {
  try {
    return parseAudioSettings(localStorage.getItem(STORAGE_KEY));
  } catch {
    return { ...DEFAULTS };
  }
}

let settings: AudioSettings | null = null;
const listeners = new Set<(value: AudioSettings) => void>();

export function getAudioSettings(): AudioSettings {
  settings ??= load();
  return settings;
}

export function setAudioSetting(key: keyof AudioSettings, value: number): void {
  settings = { ...getAudioSettings(), [key]: clamp01(value) };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Không lưu được (chế độ riêng tư...) thì chỉ áp dụng trong phiên này.
  }
  for (const listener of listeners) listener(settings);
}

/** Gọi khi cài đặt đổi; trả hàm hủy đăng ký. */
export function onAudioSettingsChange(listener: (value: AudioSettings) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
