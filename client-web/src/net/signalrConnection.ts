import { HubConnectionBuilder } from '@microsoft/signalr';
import { HUB_PATH, RECONNECT_DELAYS_MS, type HubConnectionLike } from './GameHub';

/** Kết nối thật tới Server; token được lấy lại ở mỗi lần nối. */
export function createSignalRConnection(
  baseUrl: string,
  getAccessToken: () => string | null,
): HubConnectionLike {
  return new HubConnectionBuilder()
    .withUrl(`${baseUrl}${HUB_PATH}`, { accessTokenFactory: () => getAccessToken() ?? '' })
    .withAutomaticReconnect(RECONNECT_DELAYS_MS)
    .build();
}
