// Cấu hình môi trường, xem .env.example.
export const env = {
  apiBase: (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:5080',
  useMock: import.meta.env.VITE_USE_MOCK === 'true',
};

/** Kích thước logic của game, co giãn theo cửa sổ bằng Scale.FIT. */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;
