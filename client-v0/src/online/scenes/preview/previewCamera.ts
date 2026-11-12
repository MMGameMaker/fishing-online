// Điều khiển camera cho các trang xem trước map: kéo chuột / phím mũi tên để di chuyển, Z để xem toàn map.
import Phaser from 'phaser';

const PAN_SPEED = 0.4;

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class PreviewCamera {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private zoomedOut = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly bounds: Bounds,
    center: { x: number; y: number } = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    },
  ) {
    const cam = scene.cameras.main;
    this.applyBounds();
    cam.centerOn(center.x, center.y);
    this.cursors = scene.input.keyboard!.createCursorKeys();
    scene.input.keyboard!.on('keydown-Z', () => this.toggleZoom());
    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      cam.scrollX -= (pointer.x - pointer.prevPosition.x) / cam.zoom;
      cam.scrollY -= (pointer.y - pointer.prevPosition.y) / cam.zoom;
    });
  }

  /** Gọi trong Scene.update. */
  update(delta: number): void {
    const cam = this.scene.cameras.main;
    const step = (PAN_SPEED * delta) / cam.zoom;
    if (this.cursors.left.isDown) cam.scrollX -= step;
    if (this.cursors.right.isDown) cam.scrollX += step;
    if (this.cursors.up.isDown) cam.scrollY -= step;
    if (this.cursors.down.isDown) cam.scrollY += step;
  }

  private applyBounds(): void {
    const { x, y, width, height } = this.bounds;
    // Map nhỏ hơn khung hình thì canh giữa thay vì dính góc.
    this.scene.cameras.main.setBounds(x, y, width, height, true);
  }

  private toggleZoom(): void {
    const cam = this.scene.cameras.main;
    const { x, y, width, height } = this.bounds;
    this.zoomedOut = !this.zoomedOut;
    const fit = Math.min(cam.width / width, cam.height / height);
    cam.setZoom(this.zoomedOut ? fit : 1);
    // Khi thu nhỏ, bỏ giới hạn để map nằm giữa khung hình.
    if (this.zoomedOut) cam.removeBounds();
    else this.applyBounds();
    cam.centerOn(x + width / 2, y + height / 2);
  }
}
