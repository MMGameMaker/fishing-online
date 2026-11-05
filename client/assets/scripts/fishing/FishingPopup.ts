// Popup kết quả câu cá: khung trắng viền đen, thanh tiêu đề đen chữ trắng, nút xanh lá.
// Dùng cho MISS / OOPS (kéo sớm) / OOPS (thua minigame) / SUCCESS.

import { Node, Graphics, Color, EventTouch, UITransform, Label, Sprite, SpriteFrame, view } from 'cc';
import { makeNode, makeLabel, makeSprite } from '../core/NodeKit';

const W = 460;
const TITLE_H = 44;
const BLACK = new Color(28, 28, 32, 255);
const WHITE = new Color(255, 255, 255, 255);
const GREEN = new Color(46, 204, 138, 255);
const GREEN_DARK = new Color(30, 150, 100, 255);

export class FishingPopup {
    readonly node: Node;
    private box: Node;
    private bg: Graphics;
    private title: Label;
    private body: Label;
    private icon: Sprite;
    private btn: Node;
    private btnG: Graphics;
    private btnLabel: Label;
    private h = 220;
    private onClose: (() => void) | null = null;
    onUiTouch: (() => void) | null = null;

    get active(): boolean { return this.node.active; }

    constructor(parent: Node) {
        this.node = makeNode('FishingPopup', parent);
        // Chặn chạm phía sau popup.
        this.node.getComponent(UITransform)!.setContentSize(4000, 4000);
        this.node.on(Node.EventType.TOUCH_START, (e: EventTouch) => { this.touched(); e.propagationStopped = true; });
        this.node.on(Node.EventType.TOUCH_END, (e: EventTouch) => { this.touched(); e.propagationStopped = true; });

        this.box = makeNode('Box', this.node);
        this.bg = this.box.addComponent(Graphics);
        this.title = makeLabel('Title', this.box, '', 24, WHITE, false);
        this.body = makeLabel('Body', this.box, '', 18, BLACK, false);
        this.body.overflow = Label.Overflow.RESIZE_HEIGHT;
        this.body.node.getComponent(UITransform)!.width = W - 48;
        this.icon = makeSprite('Icon', this.box, null, 0.5, 0.5);
        this.icon.node.setScale(3, 3, 1);

        this.btn = makeNode('OkButton', this.box);
        this.btnG = this.btn.addComponent(Graphics);
        this.btnLabel = makeLabel('Text', this.btn, '', 20, WHITE, false);
        this.btn.on(Node.EventType.TOUCH_START, (e: EventTouch) => { this.touched(); e.propagationStopped = true; this.drawButton(true); });
        this.btn.on(Node.EventType.TOUCH_END, (e: EventTouch) => { this.touched(); e.propagationStopped = true; this.drawButton(false); this.close(); });
        this.btn.on(Node.EventType.TOUCH_CANCEL, () => this.drawButton(false));
        this.node.active = false;
    }

    show(title: string, text: string, button: string, icon: SpriteFrame | null, onClose: (() => void) | null = null): void {
        this.onClose = onClose;
        this.title.string = title;
        this.body.string = text;
        this.btnLabel.string = button;
        this.icon.spriteFrame = icon;
        this.icon.node.active = !!icon;
        this.node.active = true;
        // Đo chiều cao chữ rồi xếp các phần từ trên xuống.
        (this.body as any).updateRenderData?.(true);
        const textH = Math.max(24, this.body.node.getComponent(UITransform)!.height);
        const iconH = icon ? 90 : 0;
        this.h = TITLE_H + 18 + textH + (icon ? 12 + iconH : 0) + 18 + 46 + 18;
        const top = this.h / 2;
        this.title.node.setPosition(0, top - TITLE_H / 2, 0);
        let y = top - TITLE_H - 18;
        this.body.node.getComponent(UITransform)!.setAnchorPoint(0.5, 1);
        this.body.node.setPosition(0, y, 0);
        y -= textH;
        if (icon) { y -= 12; this.icon.node.setPosition(0, y - iconH / 2, 0); y -= iconH; }
        y -= 18;
        this.btn.setPosition(0, y - 23, 0);
        this.btn.getComponent(UITransform)!.setContentSize(220, 46);
        this.box.getComponent(UITransform)!.setContentSize(W, this.h);
        this.drawBox();
        this.drawButton(false);
        const vs = view.getVisibleSize();
        // Giữa, hơi lệch xuống dưới như trong game gốc.
        this.box.setPosition(0, -vs.height / 2 + this.h / 2 + 40, 0);
    }

    close(): void {
        if (!this.node.active) return;
        this.node.active = false;
        const cb = this.onClose;
        this.onClose = null;
        if (cb) cb();
    }

    private touched(): void { if (this.onUiTouch) this.onUiTouch(); }

    private drawBox(): void {
        const g = this.bg, h = this.h;
        g.clear();
        g.lineWidth = 4;
        g.fillColor = WHITE;
        g.strokeColor = BLACK;
        g.roundRect(-W / 2, -h / 2, W, h, 12);
        g.fill();
        g.stroke();
        g.fillColor = BLACK;
        g.roundRect(-W / 2, h / 2 - TITLE_H, W, TITLE_H, 12);
        g.fill();
        g.rect(-W / 2, h / 2 - TITLE_H, W, 12);
        g.fill();
    }

    private drawButton(pressed: boolean): void {
        const g = this.btnG;
        g.clear();
        g.fillColor = pressed ? GREEN_DARK : GREEN;
        g.strokeColor = GREEN_DARK;
        g.lineWidth = 3;
        g.roundRect(-110, -23, 220, 46, 10);
        g.fill();
        g.stroke();
    }
}
