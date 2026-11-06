// NPC: animation idle từ sheet npc-<tên>, bảng tên và dấu nhiệm vụ trên đầu.

import Phaser from 'phaser';
import { NpcDef } from '../GameConfig';
import { Sheets } from '../core/Sheets';
import { DEPTH, FrameAnim, makeText } from '../core/Kit';

export class Npc {
    readonly sprite: Phaser.GameObjects.Image;
    /** Tên + dấu nhiệm vụ, đi theo NPC ở lớp UI của thế giới. */
    readonly overhead: Phaser.GameObjects.Container;
    readonly height: number;

    constructor(scene: Phaser.Scene, public readonly def: NpcDef) {
        const sheet = Sheets.get(def.sheet);
        const frames = sheet.order;
        const h = sheet.size(frames[0]).h;
        this.height = h;
        // Điểm neo cách đáy frame 2px (giống anchor (0.5, 2/h) bên Cocos).
        this.sprite = scene.add.image(def.x, def.y, sheet.key, frames[0]).setOrigin(0.5, 1 - 2 / h);
        this.sprite.setDepth(DEPTH.entities + def.y);
        new FrameAnim(this.sprite).play(sheet.key, frames, def.fps, true);

        this.overhead = scene.add.container(def.x, def.y - h - 2).setDepth(DEPTH.worldUi);
        const label = makeText(scene, 0, 0, def.name, 16, '#ffffff', true).setScale(0.5);
        const tag = Sheets.tryGet('ui-npc-name-tag');
        if (tag) {
            const tw = label.width * 0.5;
            const bg = scene.add.nineslice(0, 0, tag.key, tag.first(), Math.max(29, Math.ceil(tw) + 8), 12, 4, 4, 3, 3);
            this.overhead.add(bg);
        }
        this.overhead.add(label);

        if (def.quest) {
            const markers = Sheets.tryGet('ui-quest-markers');
            if (markers) {
                const prefix = def.quest === 'offer' ? 'unrepeatableIncomplete' : def.quest === 'progress' ? 'questInProgress' : 'questComplete';
                const seq = markers.sequence(prefix);
                if (seq.length) {
                    const m = scene.add.image(0, -8, markers.key, seq[0]).setOrigin(0.5, 1);
                    new FrameAnim(m).play(markers.key, seq, 10, true);
                    this.overhead.add(m);
                }
            }
        }
    }

    get x(): number { return this.def.x; }
    get y(): number { return this.def.y; }
    get sortY(): number { return this.def.y; }
}
