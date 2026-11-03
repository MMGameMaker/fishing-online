import { _decorator, Component, Sprite, SpriteFrame } from 'cc';

const { ccclass, property } = _decorator;

/** Bon huong cua bo sprite, dung thu tu hang trong sheet goc. */
export enum FaceDir {
    Down = 0,
    Left = 1,
    Right = 2,
    Up = 3,
}

/**
 * Doi frame cho nhan vat theo trang thai dung yen hoac di chuyen, va theo huong.
 *
 * Khong dung AnimationClip de khoi phai sinh file .anim; component tu dem thoi
 * gian va gan spriteFrame. Cac mang frame duoc noi san trong Main.scene va sua
 * duoc trong Inspector.
 */
@ccclass('CharacterAnimator')
export class CharacterAnimator extends Component {
    @property({ type: Sprite, tooltip: 'Sprite hien thi nhan vat; de trong thi lay tren cung node' })
    public target: Sprite | null = null;

    @property({ type: [SpriteFrame], tooltip: 'Dung yen, quay xuong' })
    public idleDown: SpriteFrame[] = [];
    @property({ type: [SpriteFrame], tooltip: 'Dung yen, quay trai' })
    public idleLeft: SpriteFrame[] = [];
    @property({ type: [SpriteFrame], tooltip: 'Dung yen, quay phai' })
    public idleRight: SpriteFrame[] = [];
    @property({ type: [SpriteFrame], tooltip: 'Dung yen, quay len' })
    public idleUp: SpriteFrame[] = [];

    @property({ type: [SpriteFrame], tooltip: 'Di chuyen, quay xuong' })
    public walkDown: SpriteFrame[] = [];
    @property({ type: [SpriteFrame], tooltip: 'Di chuyen, quay trai' })
    public walkLeft: SpriteFrame[] = [];
    @property({ type: [SpriteFrame], tooltip: 'Di chuyen, quay phai' })
    public walkRight: SpriteFrame[] = [];
    @property({ type: [SpriteFrame], tooltip: 'Di chuyen, quay len' })
    public walkUp: SpriteFrame[] = [];

    @property({ tooltip: 'So frame moi giay khi dung yen' })
    public idleFps = 4;

    @property({ tooltip: 'So frame moi giay khi di chuyen' })
    public walkFps = 10;

    private dir: FaceDir = FaceDir.Down;
    private moving = false;
    private timer = 0;
    private frame = 0;

    onLoad() {
        if (!this.target) {
            this.target = this.getComponent(Sprite);
        }
        this.apply();
    }

    /**
     * Cap nhat huong va trang thai tu input di chuyen.
     *
     * `dx`, `dy` la vector input tho, `moving` la co that su dich chuyen hay khong.
     *
     * Huong doi theo input chu khong theo `moving`, nen khi nguoi choi day vao bo
     * ho thi nhan vat van quay mat ra nuoc du dang dung yen. Dieu nay can cho game
     * cau ca, vi nguoi choi phai dung tren bo va huong ra ho.
     *
     * Huong lay theo truc co do lon lon hon, nen di cheo se chon truc troi hon.
     */
    public setMovement(dx: number, dy: number, moving: boolean) {
        let changed = false;

        if (dx !== 0 || dy !== 0) {
            const next = Math.abs(dx) >= Math.abs(dy)
                ? (dx >= 0 ? FaceDir.Right : FaceDir.Left)
                : (dy >= 0 ? FaceDir.Up : FaceDir.Down);
            if (next !== this.dir) {
                this.dir = next;
                // Doi huong giua chung thi ve lai tu frame dau cho goi gang.
                this.timer = 0;
                this.frame = 0;
                changed = true;
            }
        }

        if (moving !== this.moving) {
            this.moving = moving;
            this.timer = 0;
            this.frame = 0;
            changed = true;
        }

        // Ap dung ngay thay vi doi nhip dem frame ke tiep, neu khong viec quay
        // huong se tre toi mot phan muoi giay va trong nhu bi khuc.
        if (changed) this.apply();
    }

    update(dt: number) {
        const frames = this.currentFrames();
        if (frames.length <= 1) return;

        const fps = this.moving ? this.walkFps : this.idleFps;
        if (fps <= 0) return;

        this.timer += dt;
        const step = 1 / fps;
        while (this.timer >= step) {
            this.timer -= step;
            this.frame = (this.frame + 1) % frames.length;
            this.apply();
        }
    }

    private currentFrames(): SpriteFrame[] {
        if (this.moving) {
            switch (this.dir) {
                case FaceDir.Left: return this.walkLeft;
                case FaceDir.Right: return this.walkRight;
                case FaceDir.Up: return this.walkUp;
                default: return this.walkDown;
            }
        }
        switch (this.dir) {
            case FaceDir.Left: return this.idleLeft;
            case FaceDir.Right: return this.idleRight;
            case FaceDir.Up: return this.idleUp;
            default: return this.idleDown;
        }
    }

    private apply() {
        if (!this.target) return;
        const frames = this.currentFrames();
        if (!frames.length) return;
        const sf = frames[this.frame % frames.length];
        if (sf) this.target.spriteFrame = sf;
    }
}
