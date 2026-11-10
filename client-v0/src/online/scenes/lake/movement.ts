// Logic di chuyển thuần theo CL-B-04, không phụ thuộc Phaser.
import type { Direction } from '../../net/contract';

export const MOVE_SEND_INTERVAL_MS = 100;
const REMOTE_LERP_MS = 100;
const REMOTE_WALK_HOLD_MS = 150;
const ARRIVE_DISTANCE_PX = 2;

export function directionFromVector(dx: number, dy: number, fallback: Direction): Direction {
  if (dx === 0 && dy === 0) return fallback;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

export type MoveMessage = { seq: number; x: number; y: number; dir: Direction };

/** Gửi Move tối đa 10 lần/giây và một lần khi dừng. */
export class MoveSender {
  private seq = 0;
  private lastSentMs = Number.NEGATIVE_INFINITY;
  private wasMoving = false;

  constructor(private readonly send: (message: MoveMessage) => void) {}

  /** Gửi ngay vị trí hiện tại, dùng khi bị đặt vào ghế mà không đi bộ tới. */
  flush(nowMs: number, x: number, y: number, dir: Direction): void {
    this.lastSentMs = nowMs;
    this.seq += 1;
    this.send({ seq: this.seq, x, y, dir });
  }

  update(nowMs: number, x: number, y: number, dir: Direction, moving: boolean): void {
    const dueByTime = moving && nowMs - this.lastSentMs >= MOVE_SEND_INTERVAL_MS;
    const justStopped = !moving && this.wasMoving;
    this.wasMoving = moving;
    if (!dueByTime && !justStopped) return;
    this.lastSentMs = nowMs;
    this.seq += 1;
    this.send({ seq: this.seq, x, y, dir });
  }
}

/** Nội suy người chơi khác tới vị trí mới trong 100 ms. */
export class RemoteMotion {
  private fromX: number;
  private fromY: number;
  private toX: number;
  private toY: number;
  private startMs = Number.NEGATIVE_INFINITY;

  constructor(x: number, y: number) {
    this.fromX = x;
    this.fromY = y;
    this.toX = x;
    this.toY = y;
  }

  setTarget(x: number, y: number, nowMs: number): void {
    if (x === this.toX && y === this.toY) return;
    const current = this.sample(nowMs);
    this.fromX = current.x;
    this.fromY = current.y;
    this.toX = x;
    this.toY = y;
    this.startMs = nowMs;
  }

  sample(nowMs: number): { x: number; y: number; moving: boolean } {
    const elapsed = nowMs - this.startMs;
    const progress = Math.min(1, Math.max(0, elapsed / REMOTE_LERP_MS));
    return {
      x: this.fromX + (this.toX - this.fromX) * progress,
      y: this.fromY + (this.toY - this.fromY) * progress,
      moving: elapsed < REMOTE_LERP_MS + REMOTE_WALK_HOLD_MS,
    };
  }
}

/** Hướng chuẩn hóa tới đích; arrived khi đã đủ gần. */
export function vectorToTarget(
  x: number,
  y: number,
  targetX: number,
  targetY: number,
): { x: number; y: number; arrived: boolean } {
  const dx = targetX - x;
  const dy = targetY - y;
  const length = Math.hypot(dx, dy);
  if (length <= ARRIVE_DISTANCE_PX) return { x: 0, y: 0, arrived: true };
  return { x: dx / length, y: dy / length, arrived: false };
}

/** Quy đổi vị trí ngón tay trên joystick thành vector độ dài tối đa 1, có vùng chết. */
export function joystickVector(
  dx: number,
  dy: number,
  radius: number,
  deadZone = 0.2,
): { x: number; y: number } {
  const length = Math.hypot(dx, dy);
  if (length === 0 || length / radius < deadZone) return { x: 0, y: 0 };
  const scale = Math.min(1, length / radius) / length;
  return { x: dx * scale, y: dy * scale };
}
