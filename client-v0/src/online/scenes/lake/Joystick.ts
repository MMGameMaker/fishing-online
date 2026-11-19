import { joystickVector } from './movement';
import { localPoint, localRect } from '../../core/viewFrame';

/** Bán kính kéo = 41% cỡ đế (110px → 45px như trước); đế to hơn ở pier thì tầm kéo to theo. */
const RADIUS_RATIO = 0.41;

/** Joystick ảo cho thiết bị cảm ứng, dựa trên Pointer Events của DOM. */
export class Joystick {
  private readonly base = document.createElement('div');
  private readonly knob = document.createElement('div');
  private pointerId: number | null = null;
  private vector = { x: 0, y: 0 };

  constructor(root: HTMLElement) {
    this.base.className = 'joystick';
    this.knob.className = 'joystick__knob';
    this.base.append(this.knob);
    root.append(this.base);

    this.base.addEventListener('pointerdown', (event) => {
      this.pointerId = event.pointerId;
      this.base.setPointerCapture(event.pointerId);
      this.track(event);
    });
    this.base.addEventListener('pointermove', (event) => {
      if (event.pointerId === this.pointerId) this.track(event);
    });
    const release = (event: PointerEvent) => {
      if (event.pointerId !== this.pointerId) return;
      this.pointerId = null;
      this.vector = { x: 0, y: 0 };
      this.knob.style.transform = '';
    };
    this.base.addEventListener('pointerup', release);
    this.base.addEventListener('pointercancel', release);
  }

  get value(): { x: number; y: number } {
    return this.vector;
  }

  private track(event: PointerEvent): void {
    const rect = localRect(this.base);
    const point = localPoint(event);
    // ui-root được scale theo canvas: quy đổi px chuột thật về px thiết kế của joystick.
    const scale = rect.width / Math.max(1, this.base.offsetWidth);
    const dx = (point.x - (rect.left + rect.width / 2)) / scale;
    const dy = (point.y - (rect.top + rect.height / 2)) / scale;
    const radius = this.base.offsetWidth * RADIUS_RATIO;
    this.vector = joystickVector(dx, dy, radius);
    const limit = Math.min(1, radius / Math.max(1, Math.hypot(dx, dy)));
    this.knob.style.transform = `translate(${dx * limit}px, ${dy * limit}px)`;
  }
}
