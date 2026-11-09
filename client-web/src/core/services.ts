// Tạo các dịch vụ dùng chung và chọn mock hay Server thật theo VITE_USE_MOCK.
import type Phaser from 'phaser';
import mapJson from '@fixtures/lake-map.placeholder.json';
import { ApiClient } from '../net/ApiClient';
import { GameHub } from '../net/GameHub';
import { createSignalRConnection } from '../net/signalrConnection';
import type { LakeMap } from '../scenes/lake/walkable';
import { bindHubToStore } from '../state/bindHub';
import { Store } from '../state/store';
import { env } from './env';

export interface Services {
  store: Store;
  api: ApiClient;
  hub: GameHub;
  map: LakeMap;
  isMock: boolean;
}

const REGISTRY_KEY = 'services';

export async function createServices(): Promise<Services> {
  const store = new Store();
  const map = mapJson as LakeMap;

  if (env.useMock) {
    // Import động để bản build dùng Server thật không kèm mock.
    const { createMock } = await import('../mock/createMock');
    const mock = createMock(map);
    const api = new ApiClient({ baseUrl: env.apiBase, fetchImpl: mock.fetch });
    const hub = new GameHub(mock.createConnection());
    bindHubToStore(hub, store, () => mock.now());
    return { store, api, hub, map, isMock: true };
  }

  const api = new ApiClient({ baseUrl: env.apiBase });
  const hub = new GameHub(createSignalRConnection(env.apiBase, () => api.getAccessToken()));
  bindHubToStore(hub, store);
  return { store, api, hub, map, isMock: false };
}

export function setServices(game: Phaser.Game, services: Services): void {
  game.registry.set(REGISTRY_KEY, services);
}

export function getServices(scene: Phaser.Scene): Services {
  return scene.registry.get(REGISTRY_KEY) as Services;
}
