import type { GameHub } from '../net/GameHub';
import type { HubEventName, HubEvents } from '../net/contract';
import type { GameAction, Store } from './store';

const EVENTS: HubEventName[] = [
  'LakeSnapshot',
  'PlayerJoined',
  'PlayerLeft',
  'PlayerMoved',
  'PositionCorrected',
  'SeatChanged',
  'MyTicket',
  'MySeat',
  'AttemptUpdate',
  'CatchShown',
  'SkinChanged',
  'RodChanged',
  'ChatReceived',
  'EmojiReceived',
  'CatchAnnounced',
];

/** Nối event của hub vào store; trả hàm gỡ. */
export function bindHubToStore(hub: GameHub, store: Store, now = () => Date.now()): () => void {
  const removers = EVENTS.map((event) =>
    hub.on(event, (payload: HubEvents[typeof event]) => {
      store.dispatch({ type: event, payload } as GameAction);
      if (event === 'LakeSnapshot') {
        const offset = Date.parse((payload as HubEvents['LakeSnapshot']).serverTime) - now();
        store.dispatch({ type: 'lake/serverOffset', payload: offset });
      }
    }),
  );
  return () => removers.forEach((remove) => remove());
}
