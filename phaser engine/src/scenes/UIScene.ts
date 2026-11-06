// HUD trên màn hình (không bị camera phóng to): nút hành động trên đầu nhân vật, thanh menu,
// tiêu đề, gợi ý phím, toast, hộp thoại NPC, bảng thông tin, màn tối, minigame REEL và popup kết quả.
// Mọi thứ bấm được đều nằm ở scene này; chạm vào chỗ trống thì chuyển cho WorldScene.onTap.

import Phaser from 'phaser';
import { NpcDef } from '../GameConfig';
import { Sheets } from '../core/Sheets';
import { drawPanel, makeText } from '../core/Kit';
import { FishingMinigame } from '../fishing/FishingMinigame';
import { FishingPopup } from '../fishing/FishingPopup';
import type { WorldScene, ActionKind } from './WorldScene';

export type InfoKind = 'bag' | 'quests' | 'help';

const DEPTH = { action: 0, hud: 10, dialog: 20, info: 30, dim: 40, minigame: 50, popup: 60, toast: 70 };

export class UIScene extends Phaser.Scene {
    private world!: WorldScene;

    minigame!: FishingMinigame;
    popup!: FishingPopup;

    // Nút hành động trên đầu
    private actionBtn!: Phaser.GameObjects.Image;
    private actionKind: ActionKind = null;
    private actionWaiting = false;
    private btnHover = false;
    private btnPressed = false;

    private menu!: Phaser.GameObjects.Container;
    private bagLabel!: Phaser.GameObjects.Text;
    private title!: Phaser.GameObjects.Text;
    private hint!: Phaser.GameObjects.Text;
    private toast!: Phaser.GameObjects.Text;
    private toastT = 0;

    private dialog!: Phaser.GameObjects.Container;
    private dialogName!: Phaser.GameObjects.Text;
    private dialogText!: Phaser.GameObjects.Text;
    private dialogPortrait!: Phaser.GameObjects.Image;
    private dialogLines: string[] = [];
    private dialogIdx = 0;

    private infoPanel!: Phaser.GameObjects.Container;
    private infoLabel!: Phaser.GameObjects.Text;
    private infoKind: InfoKind | null = null;

    private dim!: Phaser.GameObjects.Rectangle;
    private dimOpacity = 0;
    private dimTarget = 0;

    constructor() { super('ui'); }

    init(data: { world: WorldScene }): void { this.world = data.world; }

    create(): void {
        const btns = Sheets.get('ui-buttons');
        this.actionBtn = this.add.image(0, 0, btns.key, 'fishButton').setOrigin(0.5, 1).setDepth(DEPTH.action).setVisible(false);
        this.actionBtn.setInteractive({ useHandCursor: true });
        this.actionBtn.on('pointerover', () => { this.btnHover = true; this.refreshButtonFrame(); });
        this.actionBtn.on('pointerout', () => { this.btnHover = false; this.btnPressed = false; this.refreshButtonFrame(); });
        this.actionBtn.on('pointerdown', () => { this.btnPressed = true; this.refreshButtonFrame(); });
        this.actionBtn.on('pointerup', () => {
            const was = this.btnPressed;
            this.btnPressed = false; this.refreshButtonFrame();
            if (was) this.world.doAction();
        });

        // Thanh menu góc phải
        this.menu = this.add.container(0, 0).setDepth(DEPTH.hud);
        const items: [string, () => void][] = [
            ['menu-inventory-icon', () => this.toggleInfo('bag')],
            ['menu-quests-icon', () => this.toggleInfo('quests')],
            ['menu-settings-icon', () => this.world.toggleDebug()],
            ['menu-help-icon', () => this.toggleInfo('help')],
        ];
        items.forEach(([name, fn], i) => {
            const sheet = Sheets.get(name);
            const s = this.add.image(-i * 52, 0, sheet.key, sheet.first()).setInteractive({ useHandCursor: true });
            s.on('pointerup', fn);
            this.menu.add(s);
        });
        this.bagLabel = makeText(this, 14, 16, '0', 14);
        this.menu.add(this.bagLabel);

        this.title = makeText(this, 0, 0, 'Coral Cove', 22).setOrigin(0, 0.5).setDepth(DEPTH.hud);
        this.hint = makeText(this, 0, 0,
            'WASD / mũi tên hoặc chạm để đi  •  F / Space: câu cá  •  E: nói chuyện  •  B: debug', 15, '#ebf5ff')
            .setDepth(DEPTH.hud);
        this.toast = makeText(this, 0, 0, '', 30, '#fff4c8').setDepth(DEPTH.toast).setVisible(false);

        // Hộp thoại NPC
        const dg = this.add.graphics();
        drawPanel(dg, 760, 170);
        this.dialogPortrait = this.add.image(-300, 0, '__DEFAULT').setScale(0.85);
        this.dialogName = makeText(this, -200, -55, '', 22, '#78461e', false, { fontStyle: 'bold' }).setOrigin(0, 0.5);
        this.dialogText = makeText(this, -200, -35, '', 20, '#3c281e', false, {
            align: 'left', wordWrap: { width: 540, useAdvancedWrap: true },
        }).setOrigin(0, 0);
        const more = makeText(this, 300, 62, 'Bấm để tiếp ▸', 14, '#966e46', false);
        this.dialog = this.add.container(0, 0, [dg, this.dialogPortrait, this.dialogName, this.dialogText, more]).setDepth(DEPTH.dialog);
        this.dialog.setSize(760, 170).setInteractive();
        this.dialog.on('pointerup', () => this.advanceDialog());
        this.dialog.setVisible(false);

        // Bảng thông tin (túi, nhiệm vụ, hướng dẫn)
        const ig = this.add.graphics();
        drawPanel(ig, 420, 300);
        this.infoLabel = makeText(this, 0, 0, '', 18, '#3c281e', false, { wordWrap: { width: 380, useAdvancedWrap: true } });
        this.infoPanel = this.add.container(0, 0, [ig, this.infoLabel]).setDepth(DEPTH.info);
        this.infoPanel.setSize(420, 300).setInteractive();
        this.infoPanel.on('pointerup', () => this.hideInfo());
        this.infoPanel.setVisible(false);

        // Màn tối khi móc được cá + minigame REEL + popup kết quả (nằm trên cùng).
        this.dim = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.5).setOrigin(0, 0).setDepth(DEPTH.dim).setVisible(false);
        this.minigame = new FishingMinigame(this, DEPTH.minigame);
        this.popup = new FishingPopup(this, DEPTH.popup);

        // Chạm vào chỗ trống (không trúng nút / bảng nào) thì để thế giới xử lý.
        this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
            if (over.length === 0) this.world.onTap(p.x, p.y);
        });

        this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
        this.layout();
        this.world.attachUi(this);
    }

    update(_time: number, deltaMs: number): void {
        const dt = Math.min(deltaMs, 100) / 1000;
        if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) this.toast.setVisible(false); }
        this.updateDim(dt);
        this.minigame.update(dt);
    }

    private layout(): void {
        const W = this.scale.width, H = this.scale.height;
        this.menu.setPosition(W - 40, 40);
        this.title.setPosition(20, 30);
        this.hint.setPosition(W / 2, H - 22);
        this.dialog.setPosition(Math.round(W / 2), Math.round(H - 130));
        this.infoPanel.setPosition(Math.round(W / 2), Math.round(H / 2));
        this.toast.setPosition(W / 2, 90);
        this.dim.setSize(W, H);
        this.minigame.layout();
        this.popup.layout();
    }

    // -----------------------------------------------------------------------
    // Nút hành động
    // -----------------------------------------------------------------------

    /** sx, sy: toạ độ màn hình của điểm đáy nút (phía trên đầu nhân vật). */
    setActionButton(kind: ActionKind, waiting: boolean, sx: number, sy: number, zoom: number): void {
        if (kind !== this.actionKind) this.btnPressed = false;
        this.actionKind = kind;
        this.actionWaiting = waiting;
        this.actionBtn.setVisible(!!kind);
        if (!kind) return;
        this.actionBtn.setScale(zoom).setPosition(Math.round(sx), Math.round(sy));
        this.refreshButtonFrame();
    }

    private refreshButtonFrame(): void {
        if (!this.actionKind) return;
        const btns = Sheets.get('ui-buttons');
        // Đồng hồ cát: đang chuẩn bị quăng, không bấm được.
        const name = this.actionWaiting ? 'waitIcon'
            : `${this.actionKind}Button${this.btnPressed ? 'Pressed' : this.btnHover ? 'Hover' : ''}`;
        if (btns.has(name) && this.actionBtn.frame.name !== name) this.actionBtn.setFrame(name);
    }

    // -----------------------------------------------------------------------
    // Hội thoại, bảng thông tin, toast, màn tối
    // -----------------------------------------------------------------------

    get dialogActive(): boolean { return this.dialog.visible; }
    get infoActive(): boolean { return this.infoPanel.visible; }

    openDialog(def: NpcDef): void {
        this.dialogLines = def.lines;
        this.dialogIdx = 0;
        this.dialogName.setText(def.name);
        const p = def.portrait ? Sheets.tryGet(def.portrait) : undefined;
        const sheet = p || Sheets.get(def.sheet);
        this.dialogPortrait.setTexture(sheet.key, sheet.first());
        this.dialogText.setText(this.dialogLines[0] || '');
        this.dialog.setVisible(true);
    }

    advanceDialog(): void {
        if (!this.dialog.visible) return;
        this.dialogIdx++;
        if (this.dialogIdx >= this.dialogLines.length) { this.dialog.setVisible(false); return; }
        this.dialogText.setText(this.dialogLines[this.dialogIdx]);
    }

    closeDialog(): void { this.dialog.setVisible(false); }

    toggleInfo(kind: InfoKind): void {
        if (this.infoPanel.visible && this.infoKind === kind) { this.hideInfo(); return; }
        this.infoKind = kind;
        let text = '';
        if (kind === 'bag') {
            text = 'TÚI ĐỒ\n\n';
            const bag = this.world.bag;
            if (!bag.size) text += 'Chưa có gì. Ra bến câu thử đi!';
            bag.forEach((n, name) => { text += `${name}  x${n}\n`; });
        } else if (kind === 'quests') {
            text = 'NHIỆM VỤ\n\nNói chuyện với Marlin ở chòi trên bến.';
        } else {
            text = 'HƯỚNG DẪN\n\nĐi: WASD / mũi tên, hoặc chạm vào chỗ muốn tới.\n' +
                'Câu cá: đứng sát mép bến, bấm nút câu hoặc F / Space.\n' +
                'Đừng bấm khi cá chưa cắn. Hiện dấu ! thì bấm ngay để móc cá.\n' +
                'Minigame: bấm REEL (hoặc Space) khi cá nằm trong vùng xanh, đủ 3 lần. Trượt 1 lần là thua.\nNói chuyện: lại gần NPC, bấm E.\nB: bật/tắt lớp debug.';
        }
        this.infoLabel.setText(text);
        this.infoPanel.setVisible(true);
    }

    hideInfo(): void { this.infoPanel.setVisible(false); }

    setBagCount(n: number): void { this.bagLabel.setText(String(n)); }

    showToast(msg: string, secs: number): void {
        this.toast.setText(msg).setVisible(true);
        this.toastT = secs;
    }

    setDim(on: boolean): void {
        this.dimTarget = on ? 1 : 0;
        if (on) this.dim.setVisible(true);
    }

    private updateDim(dt: number): void {
        if (!this.dim.visible) return;
        const step = dt / 0.25;
        const o = this.dimOpacity;
        this.dimOpacity = o < this.dimTarget ? Math.min(this.dimTarget, o + step) : Math.max(this.dimTarget, o - step);
        this.dim.setAlpha(this.dimOpacity);
        if (this.dimOpacity <= 0 && this.dimTarget === 0) this.dim.setVisible(false);
    }
}
