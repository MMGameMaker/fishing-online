import { joystickVector } from './movement';

const RADIUS_PX = 45;

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
    const rect = this.base.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    this.vector = joystickVector(dx, dy, RADIUS_PX);
    const limit = Math.min(1, RADIUS_PX / Math.max(1, Math.hypot(dx, dy)));
    this.knob.style.transform = `translate(${dx * limit}px, ${dy * limit}px)`;
  }
}
