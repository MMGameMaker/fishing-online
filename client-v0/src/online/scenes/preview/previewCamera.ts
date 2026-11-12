// Điều khiển camera cho các trang xem trước map: kéo chuột / phím mũi tên để di chuyển, Z để xem toàn map.
import Phaser from 'phaser';

const PAN_SPEED = 0.4;

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PreviewCameraOptions {
  center?: { x: number; y: number };
  /**
   * Phủ kín khung hình: phóng map vừa đủ để không còn viền đen, tự tính lại khi cửa sổ đổi cỡ
   * (dùng với Scale.RESIZE). Mặc định giữ zoom 1.
   */
  fill?: boolean;
}

export class PreviewCamera {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private zoomedOut = false;
  private readonly fill: boolean;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly bounds: Bounds,
    options: PreviewCameraOptions = {},
  ) {
    const cam = scene.cameras.main;
    this.fill = options.fill ?? false;
    const center = options.center ?? {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };
    cam.setZoom(this.baseZoom());
    this.applyBounds();
    cam.centerOn(center.x, center.y);
    this.cursors = scene.input.keyboard!.createCursorKeys();
    scene.input.keyboard!.on('keydown-Z', () => this.toggleZoom());
    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      cam.scrollX -= (pointer.x - pointer.prevPosition.x) / cam.zoom;
      cam.scrollY -= (pointer.y - pointer.prevPosition.y) / cam.zoom;
    });
    if (this.fill) {
      const onResize = (size: Phaser.Structs.Size): void => this.onResize(size);
      scene.scale.on(Phaser.Scale.Events.RESIZE, onResize);
      scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
        scene.scale.off(Phaser.Scale.Events.RESIZE, onResize),
      );
    }
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

  /** Zoom thường: 1, hoặc vừa đủ phủ kín khung hình khi bật fill. */
  private baseZoom(): number {
    if (!this.fill) return 1;
    const cam = this.scene.cameras.main;
    return Math.max(cam.width / this.bounds.width, cam.height / this.bounds.height);
  }

  private fitZoom(): number {
    const cam = this.scene.cameras.main;
    return Math.min(cam.width / this.bounds.width, cam.height / this.bounds.height);
  }

  private onResize(size: Phaser.Structs.Size): void {
    const cam = this.scene.cameras.main;
    const midX = cam.midPoint.x;
    const midY = cam.midPoint.y;
    cam.setSize(size.width, size.height);
    cam.setZoom(this.zoomedOut ? this.fitZoom() : this.baseZoom());
    cam.centerOn(midX, midY);
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
    cam.setZoom(this.zoomedOut ? this.fitZoom() : this.baseZoom());
    // Khi thu nhỏ, bỏ giới hạn để map nằm giữa khung hình.
    if (this.zoomedOut) cam.removeBounds();
    else this.applyBounds();
    cam.centerOn(x + width / 2, y + height / 2);
  }
}
