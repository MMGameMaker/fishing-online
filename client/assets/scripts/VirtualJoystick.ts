import {
    _decorator,
    Component,
    Node,
    UITransform,
    EventTouch,
    Vec2,
    Vec3,
    math,
} from 'cc';

const { ccclass, property } = _decorator;

/**
 * Joystick ao dieu khien bang chuot hoac cam ung.
 *
 * Gan tren node "Joystick" (nam trong Canvas nen khong di chuyen theo camera).
 * Keo trong vung joystick de dieu khien; nha ra thi nut tro ve giua va dung lai.
 * Doc ket qua qua thuoc tinh `direction`: huong da chuan hoa, do lon 0..1,
 * nen keo nhe thi di cham, keo het bien thi di toc do toi da.
 */
@ccclass('VirtualJoystick')
export class VirtualJoystick extends Component {
    @property({ type: Node, tooltip: 'Nut tron o giua, di chuyen theo ngon tay' })
    public knob: Node | null = null;

    @property({ tooltip: 'Ban kinh toi da nut co the roi khoi tam (pixel)' })
    public radius = 60;

    @property({ tooltip: 'Vung chet o giua, duoi muc nay coi nhu khong di chuyen (0..1)' })
    public deadZone = 0.15;

    private _direction = new Vec2(0, 0);
    private _pressed = false;
    private _uiTransform: UITransform | null = null;

    /** Huong dieu khien hien tai. Do lon 0 khi khong dung, toi da 1. */
    public get direction(): Readonly<Vec2> {
        return this._direction;
    }

    /** Dang co ngon tay / chuot tren joystick hay khong. */
    public get pressed(): boolean {
        return this._pressed;
    }

    onLoad() {
        this._uiTransform = this.node.getComponent(UITransform);

        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);

        this.resetKnob();
    }

    onDestroy() {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    private onTouchStart(e: EventTouch) {
        this._pressed = true;
        this.applyTouch(e);
    }

    private onTouchMove(e: EventTouch) {
        if (!this._pressed) return;
        this.applyTouch(e);
    }

    private onTouchEnd() {
        this._pressed = false;
        this.resetKnob();
    }

    /** Doi vi tri cham sang toa do cuc bo cua joystick, kep trong ban kinh. */
    private applyTouch(e: EventTouch) {
        if (!this._uiTransform) return;

        const ui = e.getUILocation();
        const local = this._uiTransform.convertToNodeSpaceAR(new Vec3(ui.x, ui.y, 0));

        let x = local.x;
        let y = local.y;
        const dist = Math.sqrt(x * x + y * y);

        if (dist > this.radius && dist > 0) {
            const k = this.radius / dist;
            x *= k;
            y *= k;
        }

        if (this.knob) {
            this.knob.setPosition(x, y, 0);
        }

        // Do lon 0..1 theo ti le ban kinh, bo qua vung chet.
        const mag = math.clamp01(Math.sqrt(x * x + y * y) / this.radius);
        if (mag < this.deadZone) {
            this._direction.set(0, 0);
            return;
        }
        const len = Math.sqrt(x * x + y * y);
        this._direction.set((x / len) * mag, (y / len) * mag);
    }

    private resetKnob() {
        this._direction.set(0, 0);
        if (this.knob) {
            this.knob.setPosition(0, 0, 0);
        }
    }
}
