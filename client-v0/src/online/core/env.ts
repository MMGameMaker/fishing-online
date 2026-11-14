// Cấu hình môi trường, xem .env.example.
export const env = {
  apiBase: (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:5080',
  useMock: import.meta.env.VITE_USE_MOCK === 'true',
};

/** Kích thước logic của game, co giãn theo cửa sổ bằng Scale.FIT. */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

/** Màn thiết kế của UI DOM (ảnh UI vẽ cho 1920×1080); ui-root dựng ở cỡ này rồi scale theo canvas. */
export const UI_DESIGN_WIDTH = 1920;
export const UI_DESIGN_HEIGHT = 1080;
