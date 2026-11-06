// Scene chính (tương đương RoomScene.ts bên Cocos): dựng phòng từ assets/rooms/<room>.json + 2 file TMX
// + các sprite sheet, điều khiển nhân vật, camera và toàn bộ luồng câu cá. HUD nằm ở UIScene.
//
// Thứ tự vẽ (dưới lên trên):
//   map dưới (nước, đất) → decor nhóm objectsBelow → [decor objectsAbove + NPC + người chơi, sắp theo y]
//   → map trên (objects foreground, mây) → UI trong thế giới (tên, dấu !, thẻ cá) → HUD (UIScene)

import Phaser from 'phaser';
import { Dir, GAME, PLAYER_LOOK, PLAYER_NAME, ROOM_NPCS, CATCH_TABLE, FISHING, FISHING_TEXT, NpcDef } from '../GameConfig';
import { Sheets } from '../core/Sheets';
import { DEPTH, FrameAnim, makeText } from '../core/Kit';
import { RoomData, Collision, distToRect, TeleportData, RectData } from '../world/RoomData';
import { Player } from '../world/Player';
import { Npc } from '../world/Npc';
import { TileAnimator, TmxJson, tilesetImageKey } from '../world/Tmx';
import { ReelResult } from '../fishing/FishingMinigame';
import type { LoadedRoom } from './LoadScenes';
import type { UIScene } from './UIScene';

// Luồng câu cá (theo video Coral Cove):
//   idle (nút cá trên đầu) → request (đồng hồ cát ~1s) → cast (quăng cần) → wait (7-15s, bấm = kéo sớm, thua)
//   → bite (dấu !, 1.5s để bấm bất kỳ đâu, hết giờ = trượt) → hooking (màn tối 1.5s)
//   → reel (minigame: 3 lần trúng vùng xanh, trượt 1 lần = thua ngay, hết giờ = thua)
//   → reveal (thẻ cá bay lên, bọt nước, hiện cá) → popup SUCCESS → idle
type FishState = 'idle' | 'request' | 'cast' | 'wait' | 'bite' | 'hooking' | 'reel' | 'reveal';
export type ActionKind = 'fish' | 'speak' | 'teleport' | null;
type CatchInfo = typeof CATCH_TABLE[number];

export class WorldScene extends Phaser.Scene {
    zoom = GAME.zoom;
    showDebug = false;

    private room!: RoomData;
    private mapsJson!: { below: TmxJson; above: TmxJson | null };
    private collision!: Collision;
    private tileAnims: TileAnimator[] = [];
    private debugGfx!: Phaser.GameObjects.Graphics;
    private ui!: UIScene;

    private player!: Player;
    private npcs: Npc[] = [];
    private bounds = { x: 0, y: 0, w: 0, h: 0 };
    private camX = 0;
    private camY = 0;

    // Input
    private keys = new Set<string>();
    private moveTarget: { x: number; y: number } | null = null;
    private stuckT = 0;

    // Nút hành động trên đầu
    private actionKind: ActionKind = null;
    private actionTarget: any = null;
    private playerTag!: Phaser.GameObjects.Text;
    private alert!: Phaser.GameObjects.Image;
    private alertAnim!: FrameAnim;

    // Câu cá
    private fish: FishState = 'idle';
    private fishT = 0;
    private fishZone: (RectData & { dir: Dir }) | null = null;
    readonly bag = new Map<string, number>();
    private reveal!: Phaser.GameObjects.Container;
    private revealCard!: Phaser.GameObjects.Image;
    private revealCardAnim!: FrameAnim;
    private revealSplash!: Phaser.GameObjects.Image;
    private revealSplashAnim!: FrameAnim;
    private revealIcon!: Phaser.GameObjects.Image;
    private catchInfo: CatchInfo | null = null;

    private ready = false;

    constructor() { super('world'); }

    init(data: LoadedRoom): void {
        this.room = data.room;
        this.mapsJson = { below: data.below, above: data.above };
    }

    // -----------------------------------------------------------------------
    // Dựng scene
    // -----------------------------------------------------------------------

    create(): void {
        const room = this.room;
        this.collision = new Collision(room);
        this.bounds = room.bounds || { x: 0, y: 0, w: room.pxW, h: room.pxH };

        this.addTiledMap('below', this.mapsJson.below, DEPTH.tilesBelow);

        for (const d of room.decor) {
            const sheet = Sheets.get(d.sheet);
            const frames = d.frames.filter(f => sheet.has(f));
            if (!frames.length) continue;
            const s = this.add.image(d.x, d.y, sheet.key, frames[0]).setOrigin(0, 0);
            if (d.opacity < 1) s.setAlpha(d.opacity);
            if (frames.length > 1 && d.fps > 0) {
                const a = new FrameAnim(s);
                a.play(sheet.key, frames, d.fps, d.loop);
                if (d.loop) a.randomizePhase();
            }
            s.setDepth(d.layer === 'below' ? DEPTH.decorBelow : DEPTH.entities + d.sortY);
        }

        const npcDefs: NpcDef[] = ROOM_NPCS[room.name] || [];
        for (const def of npcDefs) {
            this.npcs.push(new Npc(this, def));
            this.collision.addBlocker({ x: def.x - 10, y: def.y - 8, w: 20, h: 9 });
        }

        const sp = room.spawn;
        this.player = new Player(this, PLAYER_LOOK, sp.x, sp.y, sp.dir, this.collision);
        this.player.onCastDone = () => this.onCastDone();

        if (this.mapsJson.above) this.addTiledMap('above', this.mapsJson.above, DEPTH.tilesAbove);

        this.buildWorldUi();
        this.debugGfx = this.add.graphics().setDepth(DEPTH.debug);
        this.drawDebug();

        const cam = this.cameras.main;
        cam.setZoom(this.zoom);
        cam.setRoundPixels(true);
        cam.setBackgroundColor('#1b2838');

        this.setupKeyboard();
        this.player.update(0);
        this.updateCamera();
        this.scene.launch('ui', { world: this });
    }

    /** UIScene gọi khi đã dựng xong HUD. */
    attachUi(ui: UIScene): void {
        this.ui = ui;
        this.ready = true;
        ui.showToast('Coral Cove', 2);
    }

    private addTiledMap(name: string, json: TmxJson, depth: number): void {
        const key = 'map:' + name;
        if (!this.cache.tilemap.exists(key)) {
            this.cache.tilemap.add(key, { format: Phaser.Tilemaps.Formats.TILED_JSON, data: json });
        }
        const map = this.make.tilemap({ key });
        const tilesets = json.tilesets
            .map(ts => map.addTilesetImage(ts.name, tilesetImageKey(ts), ts.tilewidth, ts.tileheight, ts.margin, ts.spacing))
            .filter((t): t is Phaser.Tilemaps.Tileset => !!t);
        json.layers.forEach((l, i) => {
            const layer = map.createLayer(l.name, tilesets, 0, 0);
            if (layer) layer.setDepth(depth + i);
        });
        this.tileAnims.push(new TileAnimator(map, json));
    }

    private buildWorldUi(): void {
        this.playerTag = makeText(this, 0, 0, PLAYER_NAME, 16).setScale(0.5).setDepth(DEPTH.worldUi);

        const alertSheet = Sheets.get('fishing-hooked-alert');
        this.alert = this.add.image(0, 0, alertSheet.key, alertSheet.first()).setOrigin(0.5, 1)
            .setDepth(DEPTH.worldUi).setVisible(false);
        this.alertAnim = new FrameAnim(this.alert);

        // Thẻ cá: base 0..6 là thẻ bay lên từ mặt nước rồi treo trên lưỡi câu (frame 51x68).
        const caught = Sheets.get('fishing-caught');
        this.revealCard = this.add.image(0, 0, caught.key, 'fishing-caught-base-0').setOrigin(0.5, 1);
        this.revealCardAnim = new FrameAnim(this.revealCard);
        // Tâm phần thẻ trắng trong frame cuối: (14, 50) tính từ góc trên trái → so với điểm neo (25.5, 68).
        this.revealIcon = this.add.image(-11.5, -18, caught.key, caught.first()).setVisible(false);
        this.revealSplash = this.add.image(-11.5, -18, caught.key, caught.first()).setVisible(false);
        this.revealSplashAnim = new FrameAnim(this.revealSplash);
        this.reveal = this.add.container(0, 0, [this.revealCard, this.revealIcon, this.revealSplash])
            .setDepth(DEPTH.worldUi).setVisible(false);
    }

    // -----------------------------------------------------------------------
    // Vòng lặp
    // -----------------------------------------------------------------------

    update(time: number, deltaMs: number): void {
        for (const a of this.tileAnims) a.update(time);
        if (!this.ready) return;
        const dt = Math.min(deltaMs, 100) / 1000;
        this.updateMovement(dt);
        this.updateFishing(dt);
        this.player.update(dt);
        this.player.node.setDepth(DEPTH.entities + this.player.sortY);
        this.updateCamera();
        this.updateActionButton();
    }

    private busy(): boolean { return this.ui.dialogActive || this.ui.popup.active || this.ui.minigame.active; }

    /** Các bước câu cá mà nhân vật không được tự đi (đang móc / thu dây / xem cá). */
    private fishLocked(): boolean { return this.fish === 'hooking' || this.fish === 'reel' || this.fish === 'reveal'; }

    private updateMovement(dt: number): void {
        if (this.busy() || this.fishLocked()) { this.player.walk(0, 0, dt); return; }
        let dx = 0, dy = 0;
        const k = this.keys;
        if (k.has('KeyA') || k.has('ArrowLeft')) dx -= 1;
        if (k.has('KeyD') || k.has('ArrowRight')) dx += 1;
        if (k.has('KeyW') || k.has('ArrowUp')) dy -= 1;
        if (k.has('KeyS') || k.has('ArrowDown')) dy += 1;
        if (dx || dy) this.moveTarget = null;
        else if (this.moveTarget) {
            const tx = this.moveTarget.x - this.player.x, ty = this.moveTarget.y - this.player.y;
            const d = Math.hypot(tx, ty);
            if (d < 3) this.moveTarget = null;
            else { dx = tx / d; dy = ty / d; }
        }
        if (dx || dy) {
            if (this.fish !== 'idle') { this.stopFishing('Đã thu cần.'); this.moveTarget = null; }
            const len = Math.hypot(dx, dy);
            const ox = this.player.x, oy = this.player.y;
            this.player.walk(dx / len, dy / len, dt);
            if (this.moveTarget) {
                const moved = Math.hypot(this.player.x - ox, this.player.y - oy);
                this.stuckT = moved < 0.2 ? this.stuckT + dt : 0;
                if (this.stuckT > 0.25) { this.moveTarget = null; this.stuckT = 0; }
            }
        } else {
            this.player.walk(0, 0, dt);
        }
    }

    private updateCamera(): void {
        const cam = this.cameras.main;
        const z = this.zoom;
        const halfW = cam.width / 2 / z, halfH = cam.height / 2 / z;
        const b = this.bounds;
        const clamp = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
        const cx = clamp(this.player.x, b.x + halfW, b.x + b.w - halfW);
        const cy = clamp(this.player.y - 16, b.y + halfH, b.y + b.h - halfH);
        // Làm tròn theo pixel màn hình để pixel art không bị rung.
        this.camX = Math.round(cx * z) / z;
        this.camY = Math.round(cy * z) / z;
        cam.centerOn(this.camX, this.camY);
    }

    /** Toạ độ thế giới → toạ độ màn hình (dùng cho nút trên đầu ở UIScene). */
    private worldToScreen(wx: number, wy: number): { x: number; y: number } {
        const cam = this.cameras.main;
        return { x: (wx - this.camX) * this.zoom + cam.width / 2, y: (wy - this.camY) * this.zoom + cam.height / 2 };
    }

    private screenToWorld(sx: number, sy: number): { x: number; y: number } {
        const cam = this.cameras.main;
        return { x: (sx - cam.width / 2) / this.zoom + this.camX, y: (sy - cam.height / 2) / this.zoom + this.camY };
    }

    // -----------------------------------------------------------------------
    // Nút hành động (câu / nói chuyện / dịch chuyển) phía trên đầu
    // -----------------------------------------------------------------------

    private nearestFishingZone(): (RectData & { dir: Dir }) | null {
        let best: (RectData & { dir: Dir }) | null = null, bd = GAME.fishingRange;
        for (const z of this.room.fishing) {
            const d = distToRect(this.player.x, this.player.y, z);
            if (d <= bd) { bd = d; best = z; }
        }
        return best;
    }

    private nearestNpc(): Npc | null {
        let best: Npc | null = null, bd = GAME.interactRange;
        for (const n of this.npcs) {
            const d = Math.hypot(n.x - this.player.x, n.y - this.player.y);
            if (d <= bd) { bd = d; best = n; }
        }
        return best;
    }

    private nearestTeleport(): TeleportData | null {
        let best: TeleportData | null = null, bd = GAME.interactRange * 0.6;
        for (const t of this.room.teleports) {
            const d = distToRect(this.player.x, this.player.y, t);
            if (d <= bd) { bd = d; best = t; }
        }
        return best;
    }

    private updateActionButton(): void {
        let kind: ActionKind = null, target: any = null;
        if (!this.busy()) {
            if (this.fish === 'request') { kind = 'fish'; }
            else if (this.fish === 'idle') {
                const npc = this.nearestNpc();
                const zone = npc ? null : this.nearestFishingZone();
                const tp = npc || zone ? null : this.nearestTeleport();
                if (npc) { kind = 'speak'; target = npc; }
                else if (zone) { kind = 'fish'; target = zone; }
                else if (tp) { kind = 'teleport'; target = tp; }
            }
        }
        this.actionKind = kind;
        this.actionTarget = target;
        const px = Math.round(this.player.x), py = Math.round(this.player.y);
        this.playerTag.setPosition(px, py - 52);
        this.alert.setPosition(px + 14, py - 50);
        const s = this.worldToScreen(px, py - 58);
        this.ui.setActionButton(kind, this.fish === 'request', s.x, s.y, this.zoom);
    }

    doAction(): void {
        if (!this.ready) return;
        if (this.ui.dialogActive) { this.ui.advanceDialog(); return; }
        if (this.ui.popup.active) { this.ui.popup.close(); return; }
        switch (this.actionKind) {
            case 'fish':
                if (this.fish === 'idle' && this.actionTarget) this.startFishing(this.actionTarget);
                break;
            case 'speak': this.openDialog((this.actionTarget as Npc).def); break;
            case 'teleport': {
                const t = this.actionTarget as TeleportData;
                this.ui.showToast(`Cổng tới "${t.dest}": scene này chưa dựng`, 2.2);
                break;
            }
        }
    }

    // -----------------------------------------------------------------------
    // Câu cá
    // -----------------------------------------------------------------------

    private startFishing(zone: RectData & { dir: Dir }): void {
        this.moveTarget = null;
        this.fishZone = zone;
        this.player.face(zone.dir);
        this.fish = 'request';
        this.fishT = FISHING.requestTime;
    }

    private onCastDone(): void {
        if (this.fish !== 'cast') return;
        this.fish = 'wait';
        this.fishT = FISHING.waitMin + Math.random() * (FISHING.waitMax - FISHING.waitMin);
        this.player.setMode('wait');
    }

    /** Người chơi bấm/chạm bất kỳ đâu (hoặc F / Space) trong lúc đang câu. Trả về true nếu đã xử lý. */
    private fishingClick(): boolean {
        switch (this.fish) {
            case 'wait':
                this.failFishing('early');
                return true;
            case 'bite':
                this.alert.setVisible(false);
                this.fish = 'hooking';
                this.fishT = FISHING.hookTime;
                this.player.setMode('reel');
                this.ui.setDim(true);
                return true;
            case 'request': case 'cast': case 'hooking': case 'reel': case 'reveal':
                return true; // nuốt lần bấm, không làm gì
        }
        return false;
    }

    private updateFishing(dt: number): void {
        if (this.fish === 'idle' || this.fish === 'cast' || this.fish === 'reel') return;
        this.fishT -= dt;
        if (this.fishT > 0) return;
        switch (this.fish) {
            case 'request':
                this.fish = 'cast';
                if (this.fishZone) this.player.face(this.fishZone.dir);
                this.player.setMode('cast');
                break;
            case 'wait': {
                this.fish = 'bite';
                this.fishT = FISHING.biteWindow;
                this.player.setMode('hooked');
                const sheet = Sheets.get('fishing-hooked-alert');
                this.alert.setVisible(true);
                this.alertAnim.play(sheet.key, sheet.sequence('fishingHookedAlert'), 18, false);
                break;
            }
            case 'bite':
                this.failFishing('miss');
                break;
            case 'hooking':
                this.fish = 'reel';
                this.ui.minigame.open(r => this.onReelDone(r));
                break;
            case 'reveal':
                this.finishReveal();
                break;
        }
    }

    private onReelDone(r: ReelResult): void {
        this.ui.setDim(false);
        if (r === 'win') this.startReveal();
        else this.failFishing('reelFail');
    }

    private failFishing(kind: 'early' | 'miss' | 'reelFail'): void {
        this.resetFishing();
        const t = FISHING_TEXT[kind];
        this.ui.popup.show(t.title, t.body, t.button, null);
    }

    private resetFishing(): void {
        this.fish = 'idle';
        this.fishT = 0;
        this.alert.setVisible(false);
        this.reveal.setVisible(false);
        this.ui.setDim(false);
        this.player.setMode('walk');
    }

    private stopFishing(msg?: string): void {
        if (this.ui.minigame.active || this.fishLocked()) return;
        this.resetFishing();
        if (msg) this.ui.showToast(msg, 1.6);
    }

    private rollCatch(): CatchInfo {
        const total = CATCH_TABLE.reduce((s, c) => s + c.weight, 0);
        let r = Math.random() * total;
        return CATCH_TABLE.find(x => (r -= x.weight) < 0) || CATCH_TABLE[0];
    }

    /** Thẻ bay lên từ nước, treo trên lưỡi câu, bọt nước nổ, rồi hiện con cá. */
    private startReveal(): void {
        const c = this.catchInfo = this.rollCatch();
        this.fish = 'reveal';
        this.fishT = 99; // finishReveal được gọi khi chuỗi hoạt ảnh xong
        this.player.setMode('walk');
        const caught = Sheets.get('fishing-caught');
        const px = Math.round(this.player.x), py = Math.round(this.player.y);
        this.reveal.setPosition(px + 11.5, py - 56).setVisible(true);
        this.revealIcon.setVisible(false);
        this.revealSplash.setVisible(false);
        const base = caught.sequence(c.rare ? 'fishing-caught-base-gold-' : 'fishing-caught-base-');
        this.revealCardAnim.play(caught.key, base, 12, false, () => {
            this.revealSplash.setVisible(true);
            this.revealSplashAnim.play(caught.key, caught.sequence('fishing-caught-splash-'), 14, false, () => {
                this.revealSplash.setVisible(false);
                if (caught.has(c.id)) this.revealIcon.setTexture(caught.key, c.id).setVisible(true);
                this.fishT = FISHING.revealTime;
            });
        });
    }

    private finishReveal(): void {
        const c = this.catchInfo;
        this.resetFishing();
        if (!c) return;
        this.bag.set(c.name, (this.bag.get(c.name) || 0) + 1);
        let count = 0;
        this.bag.forEach(v => { count += v; });
        this.ui.setBagCount(count);
        const t = FISHING_TEXT.success;
        const name = c.rare ? `${c.name} (cá hiếm!)` : c.name;
        const caught = Sheets.get('fishing-caught');
        this.ui.popup.show(t.title, t.body.replace('{name}', name), t.button,
            caught.has(c.id) ? { key: caught.key, frame: c.id } : null);
        this.catchInfo = null;
    }

    // -----------------------------------------------------------------------
    // Hội thoại, debug
    // -----------------------------------------------------------------------

    private openDialog(def: NpcDef): void {
        this.moveTarget = null;
        const dx = def.x - this.player.x, dy = def.y - this.player.y;
        this.player.face(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'));
        this.ui.openDialog(def);
    }

    toggleDebug(): void { this.showDebug = !this.showDebug; this.drawDebug(); }

    private drawDebug(): void {
        const g = this.debugGfx;
        g.clear();
        if (!this.showDebug) return;
        const r = this.room;
        g.fillStyle(0xff0000, 90 / 255);
        for (let i = 0; i < r.blocked.length; i++) {
            if (r.blocked.charCodeAt(i) !== 49) continue;
            const tx = i % r.cols, ty = Math.floor(i / r.cols);
            g.fillRect(tx * r.tileW, ty * r.tileH, r.tileW, r.tileH);
        }
        const box = (rc: RectData, c: number, a: number) => {
            g.fillStyle(c, a);
            g.fillRect(rc.x, rc.y, Math.max(rc.w, 2), Math.max(rc.h, 2));
        };
        r.fishing.forEach(z => box(z, 0x00ffff, 200 / 255));
        r.teleports.forEach(t => box(t, 0xff00ff, 200 / 255));
        r.colliders.forEach(c => box(c, 0xffa000, 160 / 255));
    }

    // -----------------------------------------------------------------------
    // Input
    // -----------------------------------------------------------------------

    private setupKeyboard(): void {
        const kb = this.input.keyboard!;
        kb.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');
        kb.on('keydown', (e: KeyboardEvent) => this.onKeyDown(e));
        kb.on('keyup', (e: KeyboardEvent) => this.keys.delete(e.code));
        // Mất focus (alt-tab) thì nhả hết phím để nhân vật không tự đi.
        this.game.events.on(Phaser.Core.Events.BLUR, () => this.keys.clear());
    }

    private onKeyDown(e: KeyboardEvent): void {
        this.keys.add(e.code);
        if (!this.ready || e.repeat) return;
        const ui = this.ui;
        switch (e.code) {
            case 'KeyF':
            case 'Space':
                if (ui.dialogActive) ui.advanceDialog();
                else if (ui.popup.active) ui.popup.close();
                else if (ui.minigame.active) ui.minigame.reel();
                else if (this.fishingClick()) { /* đã xử lý */ }
                else if (this.actionKind === 'fish') this.doAction();
                break;
            case 'KeyE':
            case 'Enter':
            case 'NumpadEnter':
                if (ui.dialogActive) ui.advanceDialog();
                else if (ui.popup.active) ui.popup.close();
                else if (ui.minigame.active) ui.minigame.reel();
                else if (this.actionKind) this.doAction();
                break;
            case 'Escape':
                ui.closeDialog(); ui.hideInfo(); ui.popup.close();
                break;
            case 'KeyB':
                this.toggleDebug();
                break;
        }
    }

    /** Chạm/bấm chuột vào chỗ trống trên màn hình (UIScene chuyển sang). */
    onTap(sx: number, sy: number): void {
        if (!this.ready) return;
        const ui = this.ui;
        if (ui.dialogActive) { ui.advanceDialog(); return; }
        if (ui.popup.active || ui.minigame.active) return;
        if (ui.infoActive) { ui.hideInfo(); return; }
        // Đang câu: chạm bất kỳ đâu = kéo cần (chờ → kéo sớm, dấu ! → móc cá).
        if (this.fishingClick()) return;
        this.moveTarget = this.screenToWorld(sx, sy);
        this.stuckT = 0;
    }
}
