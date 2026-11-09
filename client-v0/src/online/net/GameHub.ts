// Bọc kết nối SignalR theo SPEC mục 4. Không phụ thuộc thư viện để test và mock thay được kết nối.
import type {
  CommandAck,
  HubCommandName,
  HubCommands,
  HubEventName,
  HubEvents,
  LakeSnapshot,
} from './contract';

export type HubHandler = (...args: unknown[]) => void;

/** Phần của HubConnection mà GameHub dùng; MockBackend cũng cài đặt interface này. */
export interface HubConnectionLike {
  start(): Promise<void>;
  stop(): Promise<void>;
  invoke<T>(method: string, ...args: unknown[]): Promise<T>;
  on(event: string, handler: HubHandler): void;
  onreconnecting(callback: (error?: Error) => void): void;
  onreconnected(callback: (connectionId?: string) => void): void;
  onclose(callback: (error?: Error) => void): void;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export const HUB_PATH = '/hubs/game';
/** Thời gian chờ giữa các lần nối lại, theo CL-A-04. */
export const RECONNECT_DELAYS_MS = [0, 1000, 2000, 5000, 10000];

type Listener<K extends HubEventName> = (payload: HubEvents[K]) => void;

export class GameHub {
  private stateValue: ConnectionState = 'disconnected';
  private readonly listeners = new Map<HubEventName, Set<Listener<never>>>();
  private readonly stateListeners = new Set<(state: ConnectionState) => void>();
  private readonly uuid: () => string;

  constructor(
    private readonly connection: HubConnectionLike,
    uuid?: () => string,
  ) {
    this.uuid = uuid ?? (() => crypto.randomUUID());
    connection.onreconnecting(() => this.setState('reconnecting'));
    connection.onreconnected(() => void this.afterReconnect());
    connection.onclose(() => this.setState('disconnected'));
  }

  get state(): ConnectionState {
    return this.stateValue;
  }

  /** Đăng ký trước start(). Mỗi event chỉ gắn một lần vào kết nối nên nối lại không bị trùng. */
  on<K extends HubEventName>(event: K, listener: Listener<K>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
      this.connection.on(event, (payload) => this.emit(event, payload as HubEvents[K]));
    }
    const entry = listener as Listener<never>;
    set.add(entry);
    return () => set.delete(entry);
  }

  onConnectionState(listener: (state: ConnectionState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  async start(): Promise<void> {
    this.setState('connecting');
    try {
      await this.connection.start();
      this.setState('connected');
    } catch (error) {
      this.setState('disconnected');
      throw error;
    }
  }

  async stop(): Promise<void> {
    await this.connection.stop();
    this.setState('disconnected');
  }

  invoke<K extends HubCommandName>(
    method: K,
    args: HubCommands[K]['args'],
    requestId: string = this.uuid(),
  ): Promise<CommandAck<HubCommands[K]['ack']>> {
    return this.connection.invoke(method, { requestId, ...args });
  }

  /** Vào hồ và đưa snapshot trong ack tới listener LakeSnapshot. */
  async joinLake(): Promise<CommandAck<LakeSnapshot>> {
    const ack = await this.invoke('JoinLake', {});
    if (ack.ok && ack.data) this.emit('LakeSnapshot', ack.data);
    return ack;
  }

  private async afterReconnect(): Promise<void> {
    this.setState('connected');
    try {
      await this.joinLake();
    } catch (error) {
      console.warn('Không lấy được snapshot sau khi nối lại', error);
    }
  }

  private emit<K extends HubEventName>(event: K, payload: HubEvents[K]): void {
    this.listeners.get(event)?.forEach((listener) => (listener as Listener<K>)(payload));
  }

  private setState(state: ConnectionState): void {
    if (state === this.stateValue) return;
    this.stateValue = state;
    this.stateListeners.forEach((listener) => listener(state));
  }
}
