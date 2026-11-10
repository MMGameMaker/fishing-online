import type Phaser from 'phaser';
import type { SeatView } from '../../net/contract';
import type { Store } from '../../state/store';
import type { LakeSeat } from './walkable';
import { SEAT_COLORS } from './seatLogic';

const MARKER_DEPTH = -500;
const DEFAULT_OFFSET_Y = -6;
/** 56 đơn vị logic để vùng chạm đạt 44 px CSS trên màn hẹp. */
const HIT_SIZE = 56;

interface Marker {
  seat: LakeSeat;
  rect: Phaser.GameObjects.Rectangle;
  number: Phaser.GameObjects.Text;
  owner: Phaser.GameObjects.Text;
}

/** Vẽ ghế theo trạng thái: xanh còn trống, đỏ có người. */
export class SeatMarkers {
  private readonly markers: Marker[];

  constructor(
    scene: Phaser.Scene,
    seats: LakeSeat[],
    private readonly store: Store,
    onSeatPressed: (seat: LakeSeat) => void,
    options: { depth?: number; offsetY?: number; hitSize?: number } = {},
  ) {
    const depth = options.depth ?? MARKER_DEPTH;
    const offsetY = options.offsetY ?? DEFAULT_OFFSET_Y;
    const hitSize = options.hitSize ?? HIT_SIZE;
    this.markers = seats.map((seat) => {
      const y = seat.y + offsetY;
      const style = { fontFamily: 'monospace', fontSize: '10px', color: '#101010' };
      const rect = scene.add.rectangle(seat.x, y, 20, 14, SEAT_COLORS.available);
      const number = scene.add.text(seat.x, y, String(seat.number), style).setOrigin(0.5);
      const owner = scene.add
        .text(seat.x, y + 9, '', { ...style, fontSize: '8px', color: '#ffffff' })
        .setOrigin(0.5, 0);
      rect.setDepth(depth);
      number.setDepth(depth + 1);
      owner.setDepth(depth + 1);
      const zone = scene.add
        .zone(seat.x, y, hitSize, hitSize)
        .setInteractive({ cursor: 'pointer' });
      zone.on('pointerdown', () => onSeatPressed(seat));
      return { seat, rect, number, owner };
    });
  }

  update(): void {
    const { seats, players } = this.store.getState().lake;
    for (const marker of this.markers) {
      const view: SeatView | undefined = seats[marker.seat.seatId];
      if (!view) continue;
      marker.rect.setFillStyle(SEAT_COLORS[view.state]);
      marker.number.setText(String(marker.seat.number));
      const occupant = view.occupantPlayerId ? players[view.occupantPlayerId] : undefined;
      marker.owner.setText(view.state === 'occupied' ? (occupant?.displayName ?? '') : '');
    }
  }
}
