import Phaser from 'phaser';
import { request, socket } from './net.js';
import { npcFrameCount, npcFramePrefix, npcPortraitUrl, npcScale, npcSheetKey } from './referenceArt.js';
import { toast, togglePanel } from './ui.js';

const $ = (id) => document.getElementById(id);
const FONT = 'Trebuchet MS, Verdana, sans-serif';

// Renders the room's NPCs, handles talking to them and the quest panel they open.
export class NpcController {
  constructor(scene, session) {
    this.scene = scene;
    this.session = session;
    this.sprites = new Map();
    this.active = null;
    for (const npc of session.npcs) this.addNpc(npc);
    $('npc-close').addEventListener('click', () => this.close());
    $('npc-action').addEventListener('click', () => this.act());
  }

  static bindSocket(getController) {
    socket.on('questStatus', ({ npcId, status }) => {
      getController()?.setMarker(npcId, status);
      if (status === 'ready') toast('Quest ready to turn in!');
    });
  }

  addNpc(npc) {
    const { scene } = this;
    const sheetKey = npcSheetKey(npc.id);
    const prefix = npcFramePrefix(npc.id);
    const animKey = `npc_idle_${sheetKey}`;
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: scene.anims.generateFrameNames(sheetKey, { prefix, start: 0, end: npcFrameCount(scene, npc.id) - 1 }),
        frameRate: 8,
        repeat: -1,
      });
    }
    const sprite = scene.add.sprite(npc.x, npc.y, sheetKey, `${prefix}0`)
      .setOrigin(0.5, 1).setScale(npcScale(npc.id)).setDepth(npc.y).setInteractive({ useHandCursor: true })
      .play(animKey);
    // Quest NPCs keep their old label height; the shopkeeper's label sits just above his head.
    const labelY = npc.shop ? npc.y - sprite.displayHeight - 2 : npc.y - 38;
    const label = scene.add.text(npc.x, labelY, npc.name, {
      fontFamily: FONT, fontSize: '12px', color: '#ffffff', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 1).setResolution(2).setDepth(3000);
    const marker = scene.add.text(npc.x, labelY - 10, '', {
      fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#ffd65a', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5, 1).setResolution(2).setDepth(3000);
    sprite.on('pointerover', () => sprite.setTint(0xdddddd));
    sprite.on('pointerout', () => sprite.clearTint());
    sprite.on('pointerdown', (_p, _x, _y, event) => { event.stopPropagation(); this.talk(npc); });
    const entry = { npc, sprite, label, marker };
    this.sprites.set(npc.id, entry);
    this.setMarker(npc.id, npc.questStatus);
  }

  setMarker(npcId, status) {
    const entry = this.sprites.get(npcId);
    if (!entry) return;
    entry.npc.questStatus = status;
    entry.marker.setText(status === 'new' || status === 'ready' ? '!' : '');
    entry.marker.setColor(status === 'ready' ? '#ffd65a' : '#8fe9ff');
  }

  async talk(npc) {
    if (this.session.fishing.isFishing() || this.session.sitting) return;
    const res = await request('npcTalk', { npcId: npc.id });
    if (!res.ok) { toast(res.error); return; }
    this.active = res.shop
      ? { npc, shop: true, quest: { status: 'shop', text: res.text } }
      : { npc, quest: res.quest };
    this.render();
  }

  render() {
    const { npc, quest } = this.active;
    $('npc-name').textContent = npc.name;
    $('npc-text').textContent = quest.text;
    const portraitImg = $('npc-portrait');
    const portraitUrl = npcPortraitUrl(npc.id);
    if (portraitUrl) {
      portraitImg.src = portraitUrl;
      portraitImg.hidden = false;
    } else {
      portraitImg.hidden = true;
    }
    const button = $('npc-action');
    button.hidden = false;
    if (this.active.shop) { button.textContent = 'Browse rods'; button.dataset.step = 'shop'; }
    else if (quest.status === 'new') { button.textContent = `Accept (${quest.coins} coins)`; button.dataset.step = 'accept'; }
    else if (quest.status === 'ready') { button.textContent = `Claim Reward (${quest.coins} coins)`; button.dataset.step = 'claim'; }
    else { button.hidden = true; button.dataset.step = ''; }
    $('npc-panel').hidden = false;
  }

  async act() {
    const step = $('npc-action').dataset.step;
    const { npc } = this.active;
    if (step === 'shop') {
      this.close();
      togglePanel('shop-panel');
    } else if (step === 'accept') {
      const res = await request('acceptQuest', { npcId: npc.id });
      if (!res.ok) return toast(res.error);
      this.active.quest.status = res.status;
      this.active.quest.text = res.text;
      this.setMarker(npc.id, res.status);
      this.render();
    } else if (step === 'claim') {
      const res = await request('claimQuestRewards', { questId: npc.questId });
      if (!res.ok) return toast(res.error);
      this.session.me.coins = res.coins;
      this.session.bag.render();
      this.active.quest.status = 'completed';
      this.active.quest.text = res.text;
      this.setMarker(npc.id, 'completed');
      toast(`Quest complete: +${this.active.quest.coins} coins`);
      this.render();
    }
  }

  close() {
    $('npc-panel').hidden = true;
    this.active = null;
  }

  // Shows a "Talk" prompt above the nearest NPC in range, hides it otherwise.
  update(me) {
    let nearest = null, nearestDist = Infinity;
    for (const entry of this.sprites.values()) {
      const d = Phaser.Math.Distance.Between(me.x, me.y, entry.npc.x, entry.npc.y);
      if (d < nearestDist) { nearestDist = d; nearest = entry; }
    }
    this.nearNpc = nearestDist <= 70 ? nearest?.npc : null;
  }

  destroy() {
    for (const entry of this.sprites.values()) { entry.sprite.destroy(); entry.label.destroy(); entry.marker.destroy(); }
  }
}
