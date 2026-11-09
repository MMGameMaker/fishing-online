// Đổi 20 ghế đẩu của phòng Coral Cove thành danh sách ghế theo contract. Hàm thuần.
import type { SeatTierConfig } from '../core/gameplayConfig';
import type { LakeMap, LakeSeat } from '../scenes/lake/walkable';

export interface RoomSeat {
  x: number;
  y: number;
  direction: string;
}

export interface RoomInfo {
  key: string;
  tile: number;
  width: number;
  height: number;
  seats: RoomSeat[];
}

export function tierForSeatNumber(tiers: SeatTierConfig[], number: number): number {
  const match = tiers.find((t) => number >= t.seatNumbers[0] && number <= t.seatNumbers[1]);
  if (!match) throw new Error(`Không có Tier cho ghế ${number}`);
  return match.tier;
}

export function seatIdFor(number: number): string {
  return `seat-${String(number).padStart(2, '0')}`;
}

export function buildCoralSeats(seats: RoomSeat[], tiers: SeatTierConfig[]): LakeSeat[] {
  return seats.map((seat, index) => ({
    seatId: seatIdFor(index + 1),
    number: index + 1,
    tier: tierForSeatNumber(tiers, index + 1),
    x: seat.x,
    y: seat.y,
    facing: seat.direction,
    // Trong scene này người chơi ngồi yên trên ghế nên không có phạm vi đi lại.
    roamRadius: 0,
  }));
}

/** Va chạm và di chuyển vẫn do scene hồ xử lý nên phần map để trống. */
export function buildCoralMap(room: RoomInfo, tiers: SeatTierConfig[]): LakeMap {
  const seats = buildCoralSeats(room.seats, tiers);
  const first = seats[0];
  if (!first) throw new Error('Phòng không có ghế');
  return {
    mapId: room.key,
    mapVersion: 'scene',
    tileSize: room.tile,
    widthTiles: room.width,
    heightTiles: room.height,
    walkableRows: [],
    spawn: { x: first.x, y: first.y },
    lakeArea: [],
    moveRules: { maxSpeedPxPerSec: 0, feetHalfWidth: 0, feetHeight: 0 },
    seats,
  };
}
