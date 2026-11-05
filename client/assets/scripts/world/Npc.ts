// NPC: animation idle từ sheet npc-<tên>, bảng tên và dấu nhiệm vụ trên đầu.

import { Node, Sprite, UITransform, Color } from 'cc';
import { NpcDef } from '../GameConfig';
import { Sheets } from '../core/Sheets';
import { makeNode, makeSprite, makeLabel, FrameAnim } from '../core/NodeKit';

export class Npc {
    readonly node: Node;
    /** Node gắn ở lớp UI của thế giới (tên, dấu nhiệm vụ), đi theo NPC. */
    readonly overhead: Node;
    readonly height: number;

    constructor(public readonly def: NpcDef, entities: Node, worldUi: Node) {
        const sheet = Sheets.get(def.sheet);
        const frames = sheet.frames(sheet.order);
        const h = frames[0].originalSize.height;
        this.height = h;
        this.node = makeNode('Npc-' + def.id, entities, def.x, -def.y);
        const s = makeSprite('Sprite', this.node, frames[0], 0.5, 2 / h);
        const anim = s.node.addComponent(FrameAnim);
        anim.play(frames, def.fps, true);

        // Tên + dấu nhiệm vụ
        this.overhead = makeNode('Overhead-' + def.id, worldUi, def.x, -(def.y - h - 2));
        const tag = Sheets.tryGet('ui-npc-name-tag');
        let bg: Sprite | null = null;
        if (tag) {
            const sf = tag.first();
            sf.insetLeft = sf.insetRight = 4;
            sf.insetTop = sf.insetBottom = 3;
            bg = makeSprite('NameTag', this.overhead, sf, 0.5, 0.5);
            bg.type = Sprite.Type.SLICED;
            bg.sizeMode = Sprite.SizeMode.CUSTOM;
        }
        const label = makeLabel('Name', this.overhead, def.name, 16, new Color(255, 255, 255, 255), true);
        label.node.setScale(0.5, 0.5, 1);
        if (bg) {
            label.updateRenderData(true);
            const tw = label.node.getComponent(UITransform)!.width * 0.5;
            bg.node.getComponent(UITransform)!.setContentSize(Math.max(29, Math.ceil(tw) + 8), 12);
        }

        if (def.quest) {
            const markers = Sheets.tryGet('ui-quest-markers');
            if (markers) {
                const prefix = def.quest === 'offer' ? 'unrepeatableIncomplete' : def.quest === 'progress' ? 'questInProgress' : 'questComplete';
                const seq = markers.sequence(prefix);
                const m = makeSprite('QuestMarker', this.overhead, seq[0], 0.5, 0);
                m.node.setPosition(0, 8, 0);
                m.node.addComponent(FrameAnim).play(seq, 10, true);
            }
        }
    }

    get x(): number { return this.def.x; }
    get y(): number { return this.def.y; }
    get sortY(): number { return this.def.y; }
}
