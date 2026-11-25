// Logic di chuyển thuần theo CL-B-04, không phụ thuộc Phaser.
import type { Direction } from '../../net/contract';

export const MOVE_SEND_INTERVAL_MS = 100;
const REMOTE_WALK_HOLD_MS = 150;

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

/**
 * Nội suy người chơi khác bằng bộ đệm: hiển thị chậm hơn gói mới nhận RENDER_DELAY_MS và nội suy giữa hai gói liền nhau.
 * Server gửi Move mỗi ~100-115 ms (Task.Delay lệch, máy bận còn lệch hơn); nội suy cố định 100 ms thì gói trễ làm nhân vật
 * đứng khựng rồi chạy tiếp (đi giật). Trễ thêm một nhịp thì luôn có đủ hai điểm để trượt đều (2026-11-25, bot đi giật).
 */
const RENDER_DELAY_MS = 150;
/** Nghỉ lâu hơn mức này rồi mới có gói mới thì coi là bắt đầu đi từ đứng yên. */
const REST_GAP_MS = 250;
/** Nhịp gửi danh nghĩa, dùng làm độ dài đoạn trượt đầu tiên khi bắt đầu đi. */
const NOMINAL_STEP_MS = 100;
/** Nhảy xa hơn mức này (đặt vào ghế, dịch chuyển) thì hiện ngay, không trượt. */
const TELEPORT_PX = 160;

interface MotionPoint {
  t: number;
  x: number;
  y: number;
}

export class RemoteMotion {
  private points: MotionPoint[];
  private lastArrivalMs = Number.NEGATIVE_INFINITY;

  constructor(x: number, y: number) {
    this.points = [{ t: Number.NEGATIVE_INFINITY, x, y }];
  }

  setTarget(x: number, y: number, nowMs: number): void {
    const last = this.points[this.points.length - 1]!;
    if (x === last.x && y === last.y) return;
    if (Math.hypot(x - last.x, y - last.y) > TELEPORT_PX) {
      // Nhảy xa: hiện ngay tại điểm mới.
      this.points = [{ t: nowMs - RENDER_DELAY_MS - 1, x, y }];
    } else {
      if (nowMs - last.t > REST_GAP_MS) {
        // Đang đứng yên rồi mới đi: đoạn trượt đầu bắt đầu NOMINAL_STEP_MS trước gói này.
        this.points = [{ t: nowMs - NOMINAL_STEP_MS, x: last.x, y: last.y }];
      }
      this.points.push({ t: nowMs, x, y });
    }
    this.lastArrivalMs = nowMs;
  }

  sample(nowMs: number): { x: number; y: number; moving: boolean } {
    const renderMs = nowMs - RENDER_DELAY_MS;
    const points = this.points;
    // Bỏ điểm đã qua, chỉ giữ điểm ngay trước thời điểm hiển thị.
    while (points.length > 2 && points[1]!.t <= renderMs) points.shift();
    const moving = nowMs - this.lastArrivalMs < RENDER_DELAY_MS + REMOTE_WALK_HOLD_MS;
    const from = points[0]!;
    const to = points[1];
    if (!to || renderMs >= to.t) {
      const end = to ?? from;
      return { x: end.x, y: end.y, moving };
    }
    if (renderMs <= from.t) return { x: from.x, y: from.y, moving };
    const progress = (renderMs - from.t) / (to.t - from.t);
    return {
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress,
      moving,
    };
  }
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
