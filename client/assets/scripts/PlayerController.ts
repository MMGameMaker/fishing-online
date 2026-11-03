import {
    _decorator,
    Component,
    Node,
    input,
    Input,
    KeyCode,
    EventKeyboard,
    math,
} from 'cc';
import { VirtualJoystick } from './VirtualJoystick';
import { CharacterAnimator } from './CharacterAnimator';

const { ccclass, property } = _decorator;

/**
 * Dieu khien nhan vat di chuyen quanh map.
 *
 * Hai cach dieu khien dung dong thoi:
 *  - Ban phim: WASD hoac phim mui ten (luon di toc do toi da).
 *  - Joystick ao: keo bang chuot hoac cam ung (toc do ti le theo do nghieng).
 *
 * Gan san tren node "Player" trong Main.scene; thong so chinh trong Inspector.
 */
@ccclass('PlayerController')
export class PlayerController extends Component {
    @property({ tooltip: 'Toc do di chuyen toi da (pixel moi giay)' })
    public speed = 520;

    @property({ type: Node, tooltip: 'Node World duoc dich chuyen de camera bam theo nhan vat' })
    public world: Node | null = null;

    @property({ type: VirtualJoystick, tooltip: 'Joystick ao; de trong neu chi dung ban phim' })
    public joystick: VirtualJoystick | null = null;

    @property({ type: CharacterAnimator, tooltip: 'Hoat anh nhan vat; de trong thi lay tren cung node' })
    public animator: CharacterAnimator | null = null;

    @property({ tooltip: 'Chieu ngang map (pixel)' })
    public mapWidth = 1920;

    @property({ tooltip: 'Chieu doc map (pixel)' })
    public mapHeight = 1440;

    @property({ tooltip: 'Be day vien da quanh map, nhan vat khong di ra ngoai duoc' })
    public edgePadding = 48;

    @property({ tooltip: 'Ban kinh ngang cua mat nuoc; de 0 neu map khong co ho' })
    public lakeRadiusX = 624;

    @property({ tooltip: 'Ban kinh doc cua mat nuoc' })
    public lakeRadiusY = 384;

    @property({ tooltip: 'Chieu ngang khung nhin (design resolution)' })
    public viewWidth = 960;

    @property({ tooltip: 'Chieu doc khung nhin (design resolution)' })
    public viewHeight = 640;

    @property({ tooltip: 'Nua be rong nhan vat, dung de kep trong bien map' })
    public halfSize = 30;

    private keys = new Set<number>();

    onLoad() {
        if (!this.animator) {
            this.animator = this.getComponent(CharacterAnimator);
        }
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    start() {
        this.updateCamera(this.node.position.x, this.node.position.y);
        console.log('[PlayerController] San sang. Dung WASD / phim mui ten, hoac keo joystick goc duoi ben trai.');
    }

    private onKeyDown(e: EventKeyboard) {
        this.keys.add(e.keyCode);
    }

    private onKeyUp(e: EventKeyboard) {
        this.keys.delete(e.keyCode);
    }

    update(dt: number) {
        let dx = 0;
        let dy = 0;

        // --- Ban phim ---
        if (this.keys.has(KeyCode.KEY_A) || this.keys.has(KeyCode.ARROW_LEFT)) dx -= 1;
        if (this.keys.has(KeyCode.KEY_D) || this.keys.has(KeyCode.ARROW_RIGHT)) dx += 1;
        if (this.keys.has(KeyCode.KEY_W) || this.keys.has(KeyCode.ARROW_UP)) dy += 1;
        if (this.keys.has(KeyCode.KEY_S) || this.keys.has(KeyCode.ARROW_DOWN)) dy -= 1;

        // --- Joystick ao ---
        if (this.joystick) {
            const jd = this.joystick.direction;
            dx += jd.x;
            dy += jd.y;
        }

        // Do lon toi da 1; keo joystick nhe thi di cham hon.
        let mag = Math.sqrt(dx * dx + dy * dy);
        const moving = mag > 0.001;

        // Phai luu toa do dau khung hinh ra so rieng. `node.position` tra ve
        // chinh vector noi bo cua node, nen sau khi setPosition no da doi theo,
        // va moi phep so sanh voi no deu vo nghia.
        const startX = this.node.position.x;
        const startY = this.node.position.y;
        let nx = startX;
        let ny = startY;

        if (moving) {
            const ux = dx / mag;
            const uy = dy / mag;
            if (mag > 1) mag = 1;

            const limitX = Math.max(0, this.mapWidth / 2 - this.edgePadding - this.halfSize);
            const limitY = Math.max(0, this.mapHeight / 2 - this.edgePadding - this.halfSize);
            const step = this.speed * mag * dt;

            // Xet tung truc rieng de nhan vat truot doc bo ho thay vi dung khung lai.
            const tryX = math.clamp(startX + ux * step, -limitX, limitX);
            if (!this.inWater(tryX, ny)) nx = tryX;

            const tryY = math.clamp(startY + uy * step, -limitY, limitY);
            if (!this.inWater(nx, tryY)) ny = tryY;

            this.node.setPosition(nx, ny, 0);
        }

        // Chi coi la dang di khi thuc su nhuc nhich, de khi bi chan boi bo ho
        // thi nhan vat chuyen ve dung yen thay vi giam chan tai cho.
        const actuallyMoved = nx !== startX || ny !== startY;
        if (this.animator) {
            this.animator.setMovement(dx, dy, moving && actuallyMoved);
        }

        this.updateCamera(nx, ny);
    }

    /**
     * Vi tri nay co nam tren mat nuoc khong.
     * Ban kinh duoc cong them nua be rong nhan vat, de nhan vat dung lai tren bo
     * thay vi loi nua nguoi xuong nuoc.
     */
    private inWater(x: number, y: number): boolean {
        if (this.lakeRadiusX <= 0 || this.lakeRadiusY <= 0) return false;
        const rx = this.lakeRadiusX + this.halfSize;
        const ry = this.lakeRadiusY + this.halfSize;
        const dx = x / rx;
        const dy = y / ry;
        return dx * dx + dy * dy <= 1;
    }

    /** Dich World nguoc huong nhan vat de nhan vat o giua, kep lai tai bien map. */
    private updateCamera(px: number, py: number) {
        if (!this.world) return;
        const limitX = Math.max(0, this.mapWidth / 2 - this.viewWidth / 2);
        const limitY = Math.max(0, this.mapHeight / 2 - this.viewHeight / 2);
        const camX = math.clamp(px, -limitX, limitX);
        const camY = math.clamp(py, -limitY, limitY);
        this.world.setPosition(-camX, -camY, 0);
    }
}
