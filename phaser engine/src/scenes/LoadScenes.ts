// Nạp tài nguyên theo 3 bước: json phòng → (tmx + mọi sprite sheet) → ảnh tileset ghi trong tmx.

import Phaser from 'phaser';
import { PLAYER_LOOK, ROOM_NPCS } from '../GameConfig';
import { Sheets } from '../core/Sheets';
import { makeText } from '../core/Kit';
import { RoomData } from '../world/RoomData';
import { playerSheetNames } from '../world/Player';
import { tmxToJson, tilesetImageKey, TmxJson } from '../world/Tmx';

export const ROOM_NAME = 'coralCove';

export const UI_SHEETS = [
    'ui-buttons', 'ui-quest-markers', 'ui-npc-name-tag', 'fishing-caught', 'fishing-hooked-alert', 'fishing-interface',
    'menu-inventory-icon', 'menu-quests-icon', 'menu-settings-icon', 'menu-help-icon',
];

export interface LoadedRoom {
    room: RoomData;
    below: TmxJson;
    above: TmxJson | null;
}

export class BootScene extends Phaser.Scene {
    constructor() { super('boot'); }

    preload(): void {
        this.load.json('room', `assets/rooms/${ROOM_NAME}.json`);
    }

    create(): void {
        this.scene.start('preload', { room: this.cache.json.get('room') as RoomData });
    }
}

export class PreloadScene extends Phaser.Scene {
    private room!: RoomData;
    private label!: Phaser.GameObjects.Text;

    constructor() { super('preload'); }

    init(data: { room: RoomData }): void { this.room = data.room; }

    preload(): void {
        const { width, height } = this.scale;
        this.label = makeText(this, width / 2, height / 2, 'Đang tải Coral Cove...', 28);
        this.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => {
            this.label.setText(`Đang tải Coral Cove... ${Math.round(p * 100)}%`);
        });
        this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
            this.label.setText('Lỗi khi tải: ' + file.src).setFontSize(18);
        });

        const room = this.room;
        this.load.text('tmx:below', `assets/${room.maps.below}.tmx`);
        if (room.maps.above) this.load.text('tmx:above', `assets/${room.maps.above}.tmx`);

        const npcDefs = ROOM_NPCS[room.name] || [];
        Sheets.queue(this.load, [
            ...room.decor.map(d => d.sheet),
            ...playerSheetNames(PLAYER_LOOK),
            ...npcDefs.map(n => n.sheet),
            ...npcDefs.filter(n => n.portrait).map(n => n.portrait!),
            ...UI_SHEETS,
        ]);
    }

    create(): void {
        const room = this.room;
        const npcDefs = ROOM_NPCS[room.name] || [];
        Sheets.register(this, [
            ...room.decor.map(d => d.sheet),
            ...playerSheetNames(PLAYER_LOOK),
            ...npcDefs.map(n => n.sheet),
            ...npcDefs.filter(n => n.portrait).map(n => n.portrait!),
            ...UI_SHEETS,
        ]);

        const dirOf = (p: string) => 'assets/' + p.substring(0, p.lastIndexOf('/'));
        const below = tmxToJson(this.cache.text.get('tmx:below'), dirOf(room.maps.below));
        const above = room.maps.above ? tmxToJson(this.cache.text.get('tmx:above'), dirOf(room.maps.above)) : null;

        // Bước 3: ảnh tileset.
        for (const ts of [...below.tilesets, ...(above ? above.tilesets : [])]) {
            const key = tilesetImageKey(ts);
            if (!this.textures.exists(key)) this.load.image(key, ts.image);
        }
        const go = () => this.scene.start('world', { room, below, above } as LoadedRoom);
        if (this.load.list.size > 0) {
            this.load.once(Phaser.Loader.Events.COMPLETE, go);
            this.load.start();
        } else go();
    }
}
