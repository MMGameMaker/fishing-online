import { HubConnectionBuilder } from '@microsoft/signalr';
import { HUB_PATH, RECONNECT_DELAYS_MS, type HubConnectionLike } from './GameHub';

/** Kết nối thật tới Server; token được lấy lại ở mỗi lần nối. */
export function createSignalRConnection(
  baseUrl: string,
  getAccessToken: () => string | null,
  devPlayerId: string | null = null,
): HubConnectionLike {
  // Đăng nhập dev: WebSocket trình duyệt không gửi được header nên player id đi qua query.
  const query = devPlayerId ? `?dev_player=${encodeURIComponent(devPlayerId)}` : '';
  return new HubConnectionBuilder()
    .withUrl(`${baseUrl}${HUB_PATH}${query}`, { accessTokenFactory: () => getAccessToken() ?? '' })
    .withAutomaticReconnect(RECONNECT_DELAYS_MS)
    .build();
}
