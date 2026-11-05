// Component chính: gắn vào node Canvas. Dựng toàn bộ phòng lúc chạy từ
// assets/resources/rooms/<room>.json + 2 file TMX + các sprite sheet.
//
// Thứ tự vẽ (dưới lên trên):
//   map dưới (nước, đất) → decor nhóm objectsBelow → [decor objectsAbove + NPC + người chơi, sắp theo y]
//   → map trên (objects foreground, mây) → UI trong thế giới (tên, nút) → HUD màn hình

import {
    _decorator, Component, Node, JsonAsset, TiledMap, TiledMapAsset, UITransform, Vec3, Color, Graphics,
    input, Input, EventKeyboard, KeyCode, EventTouch, view, Sprite, Label, UIOpacity, Texture2D, SpriteFrame,
} from 'cc';
import {
    Dir, GAME, PLAYER_LOOK, PLAYER_NAME, ROOM_NPCS, CATCH_TABLE, FISHING, FISHING_TEXT, NpcDef,
} from './GameConfig';
import { FishingMinigame, ReelResult } from './fishing/FishingMinigame';
import { FishingPopup } from './fishing/FishingPopup';
import { Sheets, loadRes } from './core/Sheets';
import { makeNode, makeSprite, makeLabel, makePanel, setLayerDeep, FrameAnim } from './core/NodeKit';
import { RoomData, Collision, distToRect, TeleportData, RectData } from './world/RoomData';
import { Player, playerSheetNames } from './world/Player';
import { Npc } from './world/Npc';

const { ccclass, property } = _decorator;

// Luồng câu cá (theo video Coral Cove):
//   idle (nút cá trên đầu) → request (đồng hồ cát ~1s) → cast (quăng cần) → wait (7-15s, bấm = kéo sớm, thua)
//   → bite (dấu !, 1.5s để bấm bất kỳ đâu, hết giờ = trượt) → hooking (màn tối 1.5s)
//   → reel (minigame: 3 lần trúng vùng xanh, trượt 1 lần = thua ngay, hết giờ = thua)
//   → reveal (thẻ cá bay lên, bọt nước, hiện cá) → popup SUCCESS → idle
type FishState = 'idle' | 'request' | 'cast' | 'wait' | 'bite' | 'hooking' | 'reel' | 'reveal';
type ActionKind = 'fish' | 'speak' | 'teleport' | null;

interface Sortable { node: Node; sortY: () => number; }

const UI_SHEETS = [
    'ui-buttons', 'ui-quest-markers', 'ui-npc-name-tag', 'fishing-caught', 'fishing-hooked-alert', 'fishing-interface',
    'menu-inventory-icon', 'menu-quests-icon', 'menu-settings-icon', 'menu-help-icon',
];

@ccclass('RoomScene')
export class RoomScene extends Component {
    @property({ tooltip: 'Tên map trong assets/resources/rooms (chạy tools/build-room.mjs để tạo)' })
    roomName = 'coralCove';

    @property({ tooltip: 'Độ phóng pixel art' })
    zoom = GAME.zoom;

    @property({ tooltip: 'Vẽ ô chặn, vùng câu, cổng (bật/tắt bằng phím B khi chạy)' })
    showDebug = false;

    private room!: RoomData;
    private collision!: Collision;
    private world!: Node;
    private mapRoot!: Node;
    private entities!: Node;
    private worldUi!: Node;
    private hud!: Node;
    private debugGfx: Graphics | null = null;

    private player!: Player;
    private npcs: Npc[] = [];
    private sortables: Sortable[] = [];
    private bounds = { x: 0, y: 0, w: 0, h: 0 };

    // Input
    private keys = new Set<KeyCode>();
    private moveTarget: { x: number; y: number } | null = null;
    private stuckT = 0;
    private lastUiTouch = 0;

    // Nút hành động trên đầu
    private actionBtn!: Sprite;
    private actionKind: ActionKind = null;
    private actionTarget: any = null;
    private btnHover = false;
    private btnPressed = false;
    private playerTag!: Node;
    private alert!: Sprite;

    // Câu cá
    private fish: FishState = 'idle';
    private fishT = 0;
    private fishZone: (RectData & { dir: Dir }) | null = null;
    private bag = new Map<string, number>();
    private minigame!: FishingMinigame;
    private result!: FishingPopup;
    private dim!: Node;
    private dimOpacity!: UIOpacity;
    private dimTarget = 0;
    private reveal!: Node;
    private revealCard!: Sprite;
    private revealSplash!: Sprite;
    private revealIcon!: Sprite;
    private catchInfo: typeof CATCH_TABLE[number] | null = null;

    // HUD
    private toast!: Label;
    private toastT = 0;
    private dialog!: Node;
    private dialogName!: Label;
    private dialogText!: Label;
    private dialogPortrait!: Sprite;
    private dialogLines: string[] = [];
    private dialogIdx = 0;
    private infoPanel!: Node;
    private infoLabel!: Label;
    private bagLabel!: Label;
    private loading!: Label;
    private ready = false;
    private viewW = 0;
    private viewH = 0;

    // -----------------------------------------------------------------------
    // Dựng scene
    // -----------------------------------------------------------------------

    start(): void {
        // Node này nằm ở tâm Canvas; cần UITransform để đổi toạ độ chạm.
        if (!this.node.getComponent(UITransform)) this.node.addComponent(UITransform);
        this.loading = makeLabel('Loading', this.node, 'Đang tải Coral Cove...', 28);
        this.build().catch(e => {
            console.error(e);
            this.loading.string = 'Lỗi khi tải scene:\n' + (e?.message || e);
            this.loading.fontSize = 18;
        });
    }

    onDestroy(): void {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        input.off(Input.EventType.TOUCH_START, this.onTouch, this);
    }

    private async build(): Promise<void> {
        const json = await loadRes(`rooms/${this.roomName}`, JsonAsset);
        const room = this.room = json.json as RoomData;
        this.collision = new Collision(room);
        this.bounds = this.computeBounds(room);

        const npcDefs: NpcDef[] = ROOM_NPCS[room.name] || [];
        const sheetNames = [
            ...room.decor.map(d => d.sheet),
            ...playerSheetNames(PLAYER_LOOK),
            ...npcDefs.map(n => n.sheet),
            ...npcDefs.filter(n => n.portrait).map(n => n.portrait!),
            ...UI_SHEETS,
        ];
        const [below, above] = await Promise.all([
            loadRes(room.maps.below, TiledMapAsset),
            room.maps.above ? loadRes(room.maps.above, TiledMapAsset) : Promise.resolve(null),
            Sheets.loadAll(sheetNames),
        ]);

        // Cây node của thế giới. mapRoot: gốc toạ độ = góc trên trái map, y âm hướng xuống.
        this.world = makeNode('World', this.node);
        this.world.setScale(this.zoom, this.zoom, 1);
        this.mapRoot = makeNode('MapRoot', this.world);
        this.addTiledMap('TilesBelow', below);
        const belowDecor = makeNode('DecorBelow', this.mapRoot);
        this.entities = makeNode('Entities', this.mapRoot);
        if (above) this.addTiledMap('TilesAbove', above);
        this.worldUi = makeNode('WorldUI', this.mapRoot);

        for (const d of room.decor) {
            const parent = d.layer === 'below' ? belowDecor : this.entities;
            const sheet = Sheets.get(d.sheet);
            const frames = sheet.frames(d.frames);
            if (!frames.length) continue;
            const s = makeSprite(d.name, parent, frames[0], 0, 1);
            s.node.setPosition(d.x, -d.y, 0);
            if (d.opacity < 1) s.node.addComponent(UIOpacity).opacity = Math.round(d.opacity * 255);
            if (frames.length > 1 && d.fps > 0) {
                const a = s.node.addComponent(FrameAnim);
                a.play(frames, d.fps, d.loop);
                if (d.loop) a.randomizePhase();
            }
            if (d.layer === 'above') this.sortables.push({ node: s.node, sortY: () => d.sortY });
        }

        for (const def of npcDefs) {
            const npc = new Npc(def, this.entities, this.worldUi);
            this.npcs.push(npc);
            this.sortables.push({ node: npc.node, sortY: () => npc.sortY });
            this.collision.addBlocker({ x: def.x - 10, y: def.y - 8, w: 20, h: 9 });
        }

        const sp = room.spawn;
        this.player = new Player(this.entities, PLAYER_LOOK, sp.x, sp.y, sp.dir, this.collision);
        this.sortables.push({ node: this.player.node, sortY: () => this.player.sortY });
        this.player.onCastDone = () => this.onCastDone();

        this.buildWorldUi();
        this.buildHud();
        this.debugGfx = makeNode('Debug', this.mapRoot).addComponent(Graphics);
        this.drawDebug();

        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        input.on(Input.EventType.TOUCH_START, this.onTouch, this);

        this.loading.node.destroy();
        this.ready = true;
        this.player.update(0);
        this.updateCamera();
        this.showToast('Coral Cove', 2);
    }

    private addTiledMap(name: string, asset: TiledMapAsset): void {
        for (const sf of asset.spriteFrames as SpriteFrame[]) {
            const tex = sf?.texture as Texture2D;
            if (tex && tex.setFilters) tex.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
        }
        const n = makeNode(name, this.mapRoot);
        const tm = n.addComponent(TiledMap);
        tm.tmxAsset = asset;
        setLayerDeep(n);
        // Đưa góc trên trái của map về gốc toạ độ của mapRoot.
        const ut = n.getComponent(UITransform)!;
        n.setPosition(ut.width * ut.anchorX, -ut.height * (1 - ut.anchorY), 0);
    }

    /** Vùng có tile thật sự (để camera không lộ phần map trống). */
    private computeBounds(room: RoomData): { x: number; y: number; w: number; h: number } {
        const b = (room as any).bounds;
        if (b) return b;
        return { x: 0, y: 0, w: room.pxW, h: room.pxH };
    }

    private buildWorldUi(): void {
        const btns = Sheets.get('ui-buttons');
        this.actionBtn = makeSprite('ActionButton', this.worldUi, btns.frame('fishButton'), 0.5, 0);
        const bn = this.actionBtn.node;
        bn.active = false;
        bn.on(Node.EventType.MOUSE_ENTER, () => { this.btnHover = true; this.refreshButtonFrame(); });
        bn.on(Node.EventType.MOUSE_LEAVE, () => { this.btnHover = false; this.btnPressed = false; this.refreshButtonFrame(); });
        bn.on(Node.EventType.TOUCH_START, (e: EventTouch) => {
            this.lastUiTouch = Date.now();
            this.btnPressed = true; this.refreshButtonFrame();
            e.propagationStopped = true;
        });
        bn.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
            this.lastUiTouch = Date.now();
            this.btnPressed = false; this.refreshButtonFrame();
            e.propagationStopped = true;
            this.doAction();
        });
        bn.on(Node.EventType.TOUCH_CANCEL, () => { this.btnPressed = false; this.refreshButtonFrame(); });

        this.playerTag = makeNode('PlayerName', this.worldUi);
        const l = makeLabel('Label', this.playerTag, PLAYER_NAME, 16, new Color(255, 255, 255, 255));
        l.node.setScale(0.5, 0.5, 1);

        const alertSheet = Sheets.get('fishing-hooked-alert');
        this.alert = makeSprite('HookedAlert', this.worldUi, alertSheet.first(), 0.5, 0);
        this.alert.node.addComponent(FrameAnim);
        this.alert.node.active = false;

        // Thẻ cá: base 0..6 là thẻ bay lên từ mặt nước rồi treo trên lưỡi câu (frame 51x68).
        const caught = Sheets.get('fishing-caught');
        this.reveal = makeNode('CatchReveal', this.worldUi);
        this.revealCard = makeSprite('Card', this.reveal, caught.frame('fishing-caught-base-0'), 0.5, 0);
        this.revealCard.node.addComponent(FrameAnim);
        // Tâm phần thẻ trắng trong frame cuối: (14, 50) tính từ góc trên trái → so với điểm neo (25.5, 68).
        this.revealIcon = makeSprite('Fish', this.reveal, null, 0.5, 0.5);
        this.revealIcon.node.setPosition(-11.5, 18, 0);
        this.revealSplash = makeSprite('Splash', this.reveal, null, 0.5, 0.5);
        this.revealSplash.node.setPosition(-11.5, 18, 0);
        this.revealSplash.node.addComponent(FrameAnim);
        this.reveal.active = false;
    }

    private buildHud(): void {
        this.hud = makeNode('HUD', this.node);

        this.toast = makeLabel('Toast', this.hud, '', 30, new Color(255, 244, 200, 255));
        this.toast.node.active = false;

        // Thanh menu góc phải
        const menu = makeNode('Menu', this.hud);
        menu.name = 'Menu';
        const items: [string, string, () => void][] = [
            ['menu-inventory-icon', 'Túi', () => this.toggleInfo('bag')],
            ['menu-quests-icon', 'Nhiệm vụ', () => this.toggleInfo('quests')],
            ['menu-settings-icon', 'Debug', () => { this.showDebug = !this.showDebug; this.drawDebug(); }],
            ['menu-help-icon', 'Hướng dẫn', () => this.toggleInfo('help')],
        ];
        items.forEach(([sheet, , fn], i) => {
            const s = makeSprite(sheet, menu, Sheets.get(sheet).first(), 0.5, 0.5);
            s.node.setPosition(-i * 52, 0, 0);
            s.node.on(Node.EventType.TOUCH_END, (e: EventTouch) => { this.lastUiTouch = Date.now(); e.propagationStopped = true; fn(); });
            s.node.on(Node.EventType.TOUCH_START, (e: EventTouch) => { this.lastUiTouch = Date.now(); e.propagationStopped = true; });
        });
        this.bagLabel = makeLabel('BagCount', menu, '0', 14);
        this.bagLabel.node.setPosition(14, -16, 0);

        const title = makeLabel('Title', this.hud, 'Coral Cove', 22, new Color(255, 255, 255, 255));
        title.node.name = 'Title';

        const hint = makeLabel('Hint', this.hud,
            'WASD / mũi tên hoặc chạm để đi  •  F / Space: câu cá  •  E: nói chuyện  •  B: debug', 15,
            new Color(235, 245, 255, 255));
        hint.node.name = 'Hint';

        // Hộp thoại NPC
        this.dialog = makeNode('Dialog', this.hud);
        makePanel('Bg', this.dialog, 760, 170);
        this.dialogPortrait = makeSprite('Portrait', this.dialog, null, 0.5, 0.5);
        this.dialogPortrait.node.setPosition(-300, 0, 0);
        this.dialogPortrait.node.setScale(0.85, 0.85, 1);
        this.dialogName = makeLabel('Name', this.dialog, '', 22, new Color(120, 70, 30, 255), false);
        this.dialogName.node.getComponent(UITransform)!.setAnchorPoint(0, 0.5);
        this.dialogName.horizontalAlign = Label.HorizontalAlign.LEFT;
        this.dialogName.node.setPosition(-200, 55, 0);
        this.dialogText = makeLabel('Text', this.dialog, '', 20, new Color(60, 40, 30, 255), false);
        this.dialogText.overflow = Label.Overflow.RESIZE_HEIGHT;
        this.dialogText.horizontalAlign = Label.HorizontalAlign.LEFT;
        const tut = this.dialogText.node.getComponent(UITransform)!;
        tut.setAnchorPoint(0, 1);
        tut.width = 540;
        this.dialogText.node.setPosition(-200, 35, 0);
        const more = makeLabel('More', this.dialog, 'Bấm để tiếp ▸', 14, new Color(150, 110, 70, 255), false);
        more.node.setPosition(300, -62, 0);
        this.dialog.on(Node.EventType.TOUCH_END, (e: EventTouch) => { this.lastUiTouch = Date.now(); e.propagationStopped = true; this.advanceDialog(); });
        this.dialog.getComponent(UITransform)!.setContentSize(760, 170);
        this.dialog.active = false;

        // Bảng thông tin (túi, nhiệm vụ, hướng dẫn)
        this.infoPanel = makeNode('Info', this.hud);
        makePanel('Bg', this.infoPanel, 420, 300);
        this.infoLabel = makeLabel('Text', this.infoPanel, '', 18, new Color(60, 40, 30, 255), false);
        this.infoLabel.overflow = Label.Overflow.RESIZE_HEIGHT;
        this.infoLabel.node.getComponent(UITransform)!.width = 380;
        this.infoPanel.getComponent(UITransform)!.setContentSize(420, 300);
        this.infoPanel.on(Node.EventType.TOUCH_END, (e: EventTouch) => { this.lastUiTouch = Date.now(); e.propagationStopped = true; this.infoPanel.active = false; });
        this.infoPanel.active = false;

        // Màn tối khi móc được cá + minigame REEL + popup kết quả (nằm trên cùng).
        this.dim = makeNode('Dim', this.hud);
        const dg = this.dim.addComponent(Graphics);
        dg.fillColor = new Color(0, 0, 0, 128);
        dg.rect(-3000, -3000, 6000, 6000);
        dg.fill();
        this.dimOpacity = this.dim.addComponent(UIOpacity);
        this.dimOpacity.opacity = 0;
        this.dim.active = false;
        this.minigame = new FishingMinigame(this.hud);
        this.minigame.onUiTouch = () => { this.lastUiTouch = Date.now(); };
        this.result = new FishingPopup(this.hud);
        this.result.onUiTouch = () => { this.lastUiTouch = Date.now(); };

        this.layoutHud();
    }

    private layoutHud(): void {
        const vs = view.getVisibleSize();
        if (vs.width === this.viewW && vs.height === this.viewH) return;
        this.viewW = vs.width; this.viewH = vs.height;
        const W = vs.width / 2, H = vs.height / 2;
        this.hud.getChildByName('Menu')!.setPosition(W - 40, H - 40, 0);
        const title = this.hud.getChildByName('Title')!;
        title.getComponent(UITransform)!.setAnchorPoint(0, 0.5);
        title.setPosition(-W + 20, H - 30, 0);
        this.hud.getChildByName('Hint')!.setPosition(0, -H + 22, 0);
        this.dialog.setPosition(0, -H + 130, 0);
        this.toast.node.setPosition(0, H - 90, 0);
    }

    // -----------------------------------------------------------------------
    // Vòng lặp
    // -----------------------------------------------------------------------

    update(dt: number): void {
        if (!this.ready) return;
        this.layoutHud();
        this.updateMovement(dt);
        this.updateFishing(dt);
        this.minigame.update(dt);
        this.updateDim(dt);
        this.player.update(dt);
        this.sortEntities();
        this.updateActionButton();
        this.updateCamera();
        this.updateHudTimers(dt);
    }

    private busy(): boolean { return this.dialog.active || this.result.active || this.minigame.active; }

    /** Các bước câu cá mà nhân vật không được tự đi (đang móc / thu dây / xem cá). */
    private fishLocked(): boolean { return this.fish === 'hooking' || this.fish === 'reel' || this.fish === 'reveal'; }

    private updateMovement(dt: number): void {
        if (this.busy() || this.fishLocked()) { this.player.walk(0, 0, dt); return; }
        let dx = 0, dy = 0;
        const k = this.keys;
        if (k.has(KeyCode.KEY_A) || k.has(KeyCode.ARROW_LEFT)) dx -= 1;
        if (k.has(KeyCode.KEY_D) || k.has(KeyCode.ARROW_RIGHT)) dx += 1;
        if (k.has(KeyCode.KEY_W) || k.has(KeyCode.ARROW_UP)) dy -= 1;
        if (k.has(KeyCode.KEY_S) || k.has(KeyCode.ARROW_DOWN)) dy += 1;
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

    private sortEntities(): void {
        const list = this.sortables;
        list.sort((a, b) => a.sortY() - b.sortY());
        for (let i = 0; i < list.length; i++)
            if (list[i].node.getSiblingIndex() !== i) list[i].node.setSiblingIndex(i);
    }

    private updateCamera(): void {
        const vs = view.getVisibleSize();
        const z = this.zoom;
        const halfW = vs.width / 2 / z, halfH = vs.height / 2 / z;
        const b = this.bounds;
        const clamp = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
        const cx = clamp(this.player.x, b.x + halfW, b.x + b.w - halfW);
        const cy = clamp(this.player.y - 16, b.y + halfH, b.y + b.h - halfH);
        this.world.setPosition(Math.round(-cx * z), Math.round(cy * z), 0);
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
        if (kind !== this.actionKind) { this.btnPressed = false; }
        this.actionKind = kind;
        this.actionTarget = target;
        const bn = this.actionBtn.node;
        bn.active = !!kind;
        const px = Math.round(this.player.x), py = Math.round(this.player.y);
        this.playerTag.setPosition(px, -(py - 52), 0);
        if (kind) {
            this.refreshButtonFrame();
            bn.setPosition(px, -(py - 58), 0);
        }
        this.alert.node.setPosition(px + 14, -(py - 50), 0);
    }

    private refreshButtonFrame(): void {
        if (!this.actionKind) return;
        if (this.fish === 'request') {
            // Đồng hồ cát: đang chuẩn bị quăng, không bấm được.
            const w = Sheets.get('ui-buttons').frame('waitIcon');
            if (w) this.actionBtn.spriteFrame = w;
            return;
        }
        const suffix = this.btnPressed ? 'Pressed' : this.btnHover ? 'Hover' : '';
        const f = Sheets.get('ui-buttons').frame(`${this.actionKind}Button${suffix}`);
        if (f) this.actionBtn.spriteFrame = f;
    }

    private doAction(): void {
        if (this.dialog.active) { this.advanceDialog(); return; }
        if (this.result.active) { this.result.close(); return; }
        switch (this.actionKind) {
            case 'fish':
                if (this.fish === 'idle') this.startFishing(this.actionTarget);
                break;
            case 'speak': this.openDialog((this.actionTarget as Npc).def); break;
            case 'teleport': {
                const t = this.actionTarget as TeleportData;
                this.showToast(`Cổng tới "${t.dest}": scene này chưa dựng`, 2.2);
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
                this.alert.node.active = false;
                this.fish = 'hooking';
                this.fishT = FISHING.hookTime;
                this.player.setMode('reel');
                this.setDim(true);
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
                const seq = Sheets.get('fishing-hooked-alert').sequence('fishingHookedAlert');
                this.alert.node.active = true;
                this.alert.getComponent(FrameAnim)!.play(seq, 18, false);
                break;
            }
            case 'bite':
                this.failFishing('miss');
                break;
            case 'hooking':
                this.fish = 'reel';
                this.minigame.open(r => this.onReelDone(r));
                break;
            case 'reveal':
                this.finishReveal();
                break;
        }
    }

    private onReelDone(r: ReelResult): void {
        this.setDim(false);
        if (r === 'win') this.startReveal();
        else this.failFishing('reelFail');
    }

    private failFishing(kind: 'early' | 'miss' | 'reelFail'): void {
        this.resetFishing();
        const t = FISHING_TEXT[kind];
        this.result.show(t.title, t.body, t.button, null);
    }

    private resetFishing(): void {
        this.fish = 'idle';
        this.fishT = 0;
        this.alert.node.active = false;
        this.reveal.active = false;
        this.setDim(false);
        this.player.setMode('walk');
    }

    private stopFishing(msg?: string): void {
        if (this.minigame.active || this.fishLocked()) return;
        this.resetFishing();
        if (msg) this.showToast(msg, 1.6);
    }

    private rollCatch(): typeof CATCH_TABLE[number] {
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
        this.reveal.setPosition(px + 11.5, -(py - 56), 0);
        this.reveal.active = true;
        this.revealIcon.spriteFrame = null;
        this.revealIcon.node.active = false;
        this.revealSplash.node.active = false;
        const base = caught.sequence(c.rare ? 'fishing-caught-base-gold-' : 'fishing-caught-base-');
        this.revealCard.getComponent(FrameAnim)!.play(base, 12, false, () => {
            this.revealSplash.node.active = true;
            this.revealSplash.getComponent(FrameAnim)!.play(caught.sequence('fishing-caught-splash-'), 14, false, () => {
                this.revealSplash.node.active = false;
                this.revealIcon.spriteFrame = caught.frame(c.id);
                this.revealIcon.node.active = true;
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
        this.bagLabel.string = String(count);
        const t = FISHING_TEXT.success;
        const name = c.rare ? `${c.name} (cá hiếm!)` : c.name;
        this.result.show(t.title, t.body.replace('{name}', name), t.button, Sheets.get('fishing-caught').frame(c.id));
        this.catchInfo = null;
    }

    private setDim(on: boolean): void {
        this.dimTarget = on ? 255 : 0;
        if (on) this.dim.active = true;
    }

    private updateDim(dt: number): void {
        if (!this.dim.active) return;
        const o = this.dimOpacity.opacity;
        const step = 255 * dt / 0.25;
        const next = o < this.dimTarget ? Math.min(this.dimTarget, o + step) : Math.max(this.dimTarget, o - step);
        this.dimOpacity.opacity = next;
        if (next <= 0 && this.dimTarget === 0) this.dim.active = false;
    }

    // -----------------------------------------------------------------------
    // Hội thoại, bảng thông tin, toast
    // -----------------------------------------------------------------------

    private openDialog(def: NpcDef): void {
        this.moveTarget = null;
        const dx = def.x - this.player.x, dy = def.y - this.player.y;
        this.player.face(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'));
        this.dialogLines = def.lines;
        this.dialogIdx = 0;
        this.dialogName.string = def.name;
        const p = def.portrait ? Sheets.tryGet(def.portrait) : undefined;
        this.dialogPortrait.spriteFrame = p ? p.first() : Sheets.get(def.sheet).first();
        this.dialogText.string = this.dialogLines[0];
        this.dialog.active = true;
    }

    private advanceDialog(): void {
        this.dialogIdx++;
        if (this.dialogIdx >= this.dialogLines.length) { this.dialog.active = false; return; }
        this.dialogText.string = this.dialogLines[this.dialogIdx];
    }

    private toggleInfo(kind: 'bag' | 'quests' | 'help'): void {
        if (this.infoPanel.active && this.infoPanel.name === kind) { this.infoPanel.active = false; return; }
        this.infoPanel.name = kind;
        let text = '';
        if (kind === 'bag') {
            text = 'TÚI ĐỒ\n\n';
            if (!this.bag.size) text += 'Chưa có gì. Ra bến câu thử đi!';
            this.bag.forEach((n, name) => { text += `${name}  x${n}\n`; });
        } else if (kind === 'quests') {
            text = 'NHIỆM VỤ\n\nNói chuyện với Marlin ở chòi trên bến.';
        } else {
            text = 'HƯỚNG DẪN\n\nĐi: WASD / mũi tên, hoặc chạm vào chỗ muốn tới.\n' +
                'Câu cá: đứng sát mép bến, bấm nút câu hoặc F / Space.\n' +
                'Đừng bấm khi cá chưa cắn. Hiện dấu ! thì bấm ngay để móc cá.\n' +
                'Minigame: bấm REEL (hoặc Space) khi cá nằm trong vùng xanh, đủ 3 lần. Trượt 1 lần là thua.\nNói chuyện: lại gần NPC, bấm E.\nB: bật/tắt lớp debug.';
        }
        this.infoLabel.string = text;
        this.infoPanel.active = true;
    }

    private showToast(msg: string, secs: number): void {
        this.toast.string = msg;
        this.toast.node.active = true;
        this.toastT = secs;
    }

    private updateHudTimers(dt: number): void {
        if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) this.toast.node.active = false; }
    }

    private drawDebug(): void {
        const g = this.debugGfx;
        if (!g) return;
        g.clear();
        if (!this.showDebug) return;
        const r = this.room;
        g.fillColor = new Color(255, 0, 0, 90);
        for (let i = 0; i < r.blocked.length; i++) {
            if (r.blocked.charCodeAt(i) !== 49) continue;
            const tx = i % r.cols, ty = Math.floor(i / r.cols);
            g.rect(tx * r.tileW, -(ty + 1) * r.tileH, r.tileW, r.tileH);
        }
        g.fill();
        const box = (rc: RectData, c: Color) => {
            g.fillColor = c;
            g.rect(rc.x, -(rc.y + Math.max(rc.h, 2)), Math.max(rc.w, 2), Math.max(rc.h, 2));
            g.fill();
        };
        r.fishing.forEach(z => box(z, new Color(0, 255, 255, 200)));
        r.teleports.forEach(t => box(t, new Color(255, 0, 255, 200)));
        r.colliders.forEach(c => box(c, new Color(255, 160, 0, 160)));
    }

    // -----------------------------------------------------------------------
    // Input
    // -----------------------------------------------------------------------

    private onKeyDown(e: EventKeyboard): void {
        this.keys.add(e.keyCode);
        if (!this.ready) return;
        switch (e.keyCode) {
            case KeyCode.KEY_F:
            case KeyCode.SPACE:
                if (this.dialog.active) this.advanceDialog();
                else if (this.result.active) this.result.close();
                else if (this.minigame.active) this.minigame.reel();
                else if (this.fishingClick()) { /* đã xử lý */ }
                else if (this.actionKind === 'fish') this.doAction();
                break;
            case KeyCode.KEY_E:
            case KeyCode.ENTER:
                if (this.dialog.active) this.advanceDialog();
                else if (this.result.active) this.result.close();
                else if (this.minigame.active) this.minigame.reel();
                else if (this.actionKind) this.doAction();
                break;
            case KeyCode.ESCAPE:
                this.dialog.active = false; this.infoPanel.active = false; this.result.close();
                break;
            case KeyCode.KEY_B:
                this.showDebug = !this.showDebug; this.drawDebug();
                break;
        }
    }

    private onKeyUp(e: EventKeyboard): void { this.keys.delete(e.keyCode); }

    private onTouch(e: EventTouch): void {
        if (!this.ready || Date.now() - this.lastUiTouch < 80) return;
        if (this.dialog.active) { this.advanceDialog(); return; }
        if (this.result.active || this.minigame.active) return;
        if (this.infoPanel.active) { this.infoPanel.active = false; return; }
        // Đang câu: chạm bất kỳ đâu = kéo cần (chờ → kéo sớm, dấu ! → móc cá).
        if (this.fishingClick()) return;
        const ui = e.getUILocation();
        const local = this.node.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(ui.x, ui.y, 0));
        const wp = this.world.position;
        this.moveTarget = { x: (local.x - wp.x) / this.zoom, y: -(local.y - wp.y) / this.zoom };
        this.stuckT = 0;
    }
}
