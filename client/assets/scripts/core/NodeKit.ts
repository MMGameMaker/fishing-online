// Tiện ích tạo node 2D bằng code (scene được dựng hoàn toàn lúc chạy).

import {
    _decorator, Component, Node, Layers, UITransform, Sprite, SpriteFrame, Label, Color, Graphics,
    HorizontalTextAlignment, VerticalTextAlignment,
} from 'cc';

const { ccclass } = _decorator;

export function makeNode(name: string, parent: Node | null, x = 0, y = 0): Node {
    const n = new Node(name);
    n.layer = Layers.Enum.UI_2D;
    n.addComponent(UITransform);
    if (parent) parent.addChild(n);
    n.setPosition(x, y, 0);
    return n;
}

/** Đặt layer UI_2D cho cả cây node (node do engine tạo ra như layer của TiledMap). */
export function setLayerDeep(n: Node, layer = Layers.Enum.UI_2D): void {
    n.layer = layer;
    for (const c of n.children) setLayerDeep(c, layer);
}

export function makeSprite(name: string, parent: Node | null, frame: SpriteFrame | null,
    anchorX = 0.5, anchorY = 0.5): Sprite {
    const n = makeNode(name, parent);
    n.getComponent(UITransform)!.setAnchorPoint(anchorX, anchorY);
    const s = n.addComponent(Sprite);
    s.sizeMode = Sprite.SizeMode.RAW;
    s.trim = false;
    s.spriteFrame = frame;
    return s;
}

export function makeLabel(name: string, parent: Node | null, text: string, size = 16,
    color = Color.WHITE, outline = true): Label {
    const n = makeNode(name, parent);
    const l = n.addComponent(Label);
    l.string = text;
    l.fontSize = size;
    l.lineHeight = Math.round(size * 1.25);
    l.color = color.clone();
    l.horizontalAlign = HorizontalTextAlignment.CENTER;
    l.verticalAlign = VerticalTextAlignment.CENTER;
    if (outline) {
        l.enableOutline = true;
        l.outlineColor = new Color(30, 30, 40, 255);
        l.outlineWidth = 2;
    }
    return l;
}

export function makePanel(name: string, parent: Node | null, w: number, h: number,
    fill = new Color(255, 248, 230, 245), stroke = new Color(92, 64, 40, 255)): Graphics {
    const n = makeNode(name, parent);
    n.getComponent(UITransform)!.setContentSize(w, h);
    const g = n.addComponent(Graphics);
    drawPanel(g, w, h, fill, stroke);
    return g;
}

export function drawPanel(g: Graphics, w: number, h: number, fill: Color, stroke: Color): void {
    g.clear();
    g.lineWidth = 4;
    g.fillColor = fill;
    g.strokeColor = stroke;
    g.roundRect(-w / 2, -h / 2, w, h, 10);
    g.fill();
    g.stroke();
}

export function hexColor(hex: string): Color {
    const c = new Color();
    Color.fromHEX(c, hex);
    return c;
}

/** Chạy một dãy SpriteFrame trên Sprite cùng node. */
@ccclass('FrameAnim')
export class FrameAnim extends Component {
    frames: SpriteFrame[] = [];
    fps = 8;
    loop = true;
    playing = false;
    private t = 0;
    private i = 0;
    private onDone: (() => void) | null = null;
    private sprite: Sprite | null = null;

    play(frames: SpriteFrame[], fps: number, loop = true, onDone: (() => void) | null = null): void {
        this.sprite = this.sprite || this.getComponent(Sprite);
        this.frames = frames;
        this.fps = fps;
        this.loop = loop;
        this.onDone = onDone;
        this.t = 0;
        this.i = 0;
        this.playing = frames.length > 1 && fps > 0;
        if (this.sprite && frames.length) this.sprite.spriteFrame = frames[0];
    }

    /** Bắt đầu ở một frame ngẫu nhiên để các decor giống nhau không chạy đồng loạt. */
    randomizePhase(): void {
        if (this.frames.length > 1) {
            this.i = Math.floor(Math.random() * this.frames.length);
            if (this.sprite) this.sprite.spriteFrame = this.frames[this.i];
        }
    }

    update(dt: number): void {
        if (!this.playing || !this.sprite) return;
        this.t += dt;
        const step = 1 / this.fps;
        let changed = false;
        while (this.t >= step) {
            this.t -= step;
            this.i++;
            changed = true;
            if (this.i >= this.frames.length) {
                if (this.loop) this.i = 0;
                else {
                    this.i = this.frames.length - 1;
                    this.playing = false;
                    const cb = this.onDone;
                    this.onDone = null;
                    this.sprite.spriteFrame = this.frames[this.i];
                    if (cb) cb();
                    return;
                }
            }
        }
        if (changed) this.sprite.spriteFrame = this.frames[this.i];
    }
}
