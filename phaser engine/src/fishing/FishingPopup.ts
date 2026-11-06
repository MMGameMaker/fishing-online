// Popup kết quả câu cá: khung trắng viền đen, thanh tiêu đề đen chữ trắng, nút xanh lá.
// Dùng cho MISS / OOPS (kéo sớm) / OOPS (thua minigame) / SUCCESS.

import Phaser from 'phaser';
import { makeText } from '../core/Kit';

const W = 460;
const TITLE_H = 44;
const BLACK = 0x1c1c20;
const WHITE = 0xffffff;
const GREEN = 0x2ecc8a;
const GREEN_DARK = 0x1e9664;
const BTN_W = 220, BTN_H = 46;

export interface IconFrame { key: string; frame: string; }

export class FishingPopup {
    readonly root: Phaser.GameObjects.Container;
    private blocker: Phaser.GameObjects.Zone;
    private box: Phaser.GameObjects.Container;
    private bg: Phaser.GameObjects.Graphics;
    private title: Phaser.GameObjects.Text;
    private body: Phaser.GameObjects.Text;
    private icon: Phaser.GameObjects.Image;
    private btn: Phaser.GameObjects.Container;
    private btnG: Phaser.GameObjects.Graphics;
    private btnLabel: Phaser.GameObjects.Text;
    private h = 220;
    private onClose: (() => void) | null = null;

    get active(): boolean { return this.root.visible; }

    constructor(private scene: Phaser.Scene, depth: number) {
        this.root = scene.add.container(0, 0).setDepth(depth);
        // Chặn chạm phía sau popup.
        this.blocker = scene.add.zone(0, 0, 10, 10).setOrigin(0, 0).setInteractive();
        this.root.add(this.blocker);

        this.box = scene.add.container(0, 0);
        this.root.add(this.box);
        this.bg = scene.add.graphics();
        this.title = makeText(scene, 0, 0, '', 24, '#ffffff', false, { fontStyle: 'bold' });
        this.body = makeText(scene, 0, 0, '', 18, '#1c1c20', false, { wordWrap: { width: W - 48, useAdvancedWrap: true } });
        this.body.setOrigin(0.5, 0);
        this.icon = scene.add.image(0, 0, '__DEFAULT').setScale(3).setVisible(false);

        this.btnG = scene.add.graphics();
        this.btnLabel = makeText(scene, 0, 0, '', 20, '#ffffff', false, { fontStyle: 'bold' });
        this.btn = scene.add.container(0, 0, [this.btnG, this.btnLabel]);
        this.btn.setSize(BTN_W, BTN_H).setInteractive({ useHandCursor: true });
        this.btn.on('pointerdown', () => this.drawButton(true));
        this.btn.on('pointerout', () => this.drawButton(false));
        this.btn.on('pointerup', () => { this.drawButton(false); this.close(); });
        this.box.add([this.bg, this.title, this.body, this.icon, this.btn]);
        this.root.setVisible(false);
    }

    show(title: string, text: string, button: string, icon: IconFrame | null, onClose: (() => void) | null = null): void {
        this.onClose = onClose;
        this.title.setText(title);
        this.body.setText(text);
        this.btnLabel.setText(button);
        if (icon) this.icon.setTexture(icon.key, icon.frame);
        this.icon.setVisible(!!icon);
        this.root.setVisible(true);
        // Đo chiều cao chữ rồi xếp các phần từ trên xuống.
        const textH = Math.max(24, this.body.height);
        const iconH = icon ? 90 : 0;
        this.h = TITLE_H + 18 + textH + (icon ? 12 + iconH : 0) + 18 + BTN_H + 18;
        const top = -this.h / 2;
        this.title.setPosition(0, top + TITLE_H / 2);
        let y = top + TITLE_H + 18;
        this.body.setPosition(0, y);
        y += textH;
        if (icon) { y += 12; this.icon.setPosition(0, y + iconH / 2); y += iconH; }
        y += 18;
        this.btn.setPosition(0, y + BTN_H / 2);
        this.drawBox();
        this.drawButton(false);
        this.layout();
    }

    close(): void {
        if (!this.root.visible) return;
        this.root.setVisible(false);
        const cb = this.onClose;
        this.onClose = null;
        if (cb) cb();
    }

    /** Giữa màn hình theo chiều ngang, sát đáy (cách 40px) như trong game gốc. */
    layout(): void {
        const w = this.scene.scale.width, h = this.scene.scale.height;
        this.blocker.setSize(w, h);
        if (this.blocker.input) (this.blocker.input.hitArea as Phaser.Geom.Rectangle).setSize(w, h);
        this.box.setPosition(Math.round(w / 2), Math.round(h - 40 - this.h / 2));
    }

    private drawBox(): void {
        const g = this.bg, h = this.h;
        g.clear();
        g.fillStyle(WHITE, 1);
        g.fillRoundedRect(-W / 2, -h / 2, W, h, 12);
        g.lineStyle(4, BLACK, 1);
        g.strokeRoundedRect(-W / 2, -h / 2, W, h, 12);
        g.fillStyle(BLACK, 1);
        g.fillRoundedRect(-W / 2, -h / 2, W, TITLE_H, { tl: 12, tr: 12, bl: 0, br: 0 });
    }

    private drawButton(pressed: boolean): void {
        const g = this.btnG;
        g.clear();
        g.fillStyle(pressed ? GREEN_DARK : GREEN, 1);
        g.fillRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, 10);
        g.lineStyle(3, GREEN_DARK, 1);
        g.strokeRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, 10);
    }
}
