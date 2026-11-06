import Phaser from 'phaser';
import { CROP_BY_ID, CROPS, FARM_REACH } from '../shared/farming.js';
import { request, socket } from './net.js';
import { toast } from './ui.js';

const FONT = 'Trebuchet MS, Verdana, sans-serif';

// Shows one interactive prompt above the nearest farm plot (plant / water / harvest), reusing
// the plot positions already painted into the room's background art — no new art drawn. A mock
// simplification: planting picks a random crop rather than offering a choice menu.
export class FarmController {
  constructor(scene, session) {
    this.scene = scene;
    this.session = session;
    this.plots = new Map();
    this.nearPlot = null;
    this.loaded = false;
    this.prompt = scene.add.text(0, 0, '', {
      fontFamily: FONT, fontSize: '13px', color: '#2b2438', backgroundColor: '#fff8e7', padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 1).setResolution(2).setDepth(3400).setVisible(false).setInteractive({ useHandCursor: true });
    this.prompt.on('pointerover', () => this.prompt.setBackgroundColor('#f3e6c8'));
    this.prompt.on('pointerout', () => this.prompt.setBackgroundColor('#fff8e7'));
    this.prompt.on('pointerdown', (_p, _x, _y, event) => { event.stopPropagation(); this.act(); });
    this.load();
  }

  static bindSocket(getController) {
    socket.on('farmUpdated', (update) => getController()?.applyUpdate(update));
  }

  async load() {
    const res = await request('getFarmPlots');
    if (!res.ok) return;
    this.seedCost = res.seedCost;
    for (const p of res.plots) this.plots.set(p.id, p);
    this.loaded = true;
  }

  applyUpdate(update) {
    const plot = this.plots.get(update.id);
    if (plot) Object.assign(plot, update);
  }

  label(plot) {
    if (plot.stage === 'empty') return `Plant a seed (${this.seedCost}c)`;
    if (plot.stage === 'planted') return 'Water';
    if (plot.stage === 'ready') return `Harvest ${CROP_BY_ID[plot.cropId].name}`;
    return 'Growing...';
  }

  async act() {
    const plot = this.nearPlot;
    if (!plot) return;
    if (plot.stage === 'empty') {
      const crop = CROPS[Math.floor(Math.random() * CROPS.length)];
      const res = await request('plantCrop', { plotId: plot.id, cropId: crop.id });
      if (!res.ok) return toast(res.error);
      Object.assign(plot, res.plot);
      this.session.me.coins = res.coins;
      this.session.bag.render();
      toast(`Planted a ${crop.name}`);
    } else if (plot.stage === 'planted') {
      const res = await request('waterPlot', { plotId: plot.id });
      if (!res.ok) return toast(res.error);
      Object.assign(plot, res.plot);
      toast('Watered — it will grow now');
    } else if (plot.stage === 'ready') {
      const res = await request('harvestPlot', { plotId: plot.id });
      if (!res.ok) return toast(res.error);
      Object.assign(plot, res.plot);
      this.session.me.coins = res.coins;
      this.session.bag.render();
      toast(`Harvested ${res.crop.name} (+${res.crop.value} coins)`);
    }
  }

  update(me, busy) {
    if (!this.loaded || busy) { this.prompt.setVisible(false); this.nearPlot = null; return; }
    let nearest = null, nearestDist = Infinity;
    for (const plot of this.plots.values()) {
      const d = Phaser.Math.Distance.Between(me.x, me.y, plot.x, plot.y);
      if (d < nearestDist) { nearestDist = d; nearest = plot; }
    }
    if (nearest && nearestDist <= FARM_REACH && nearest.stage !== 'growing') {
      this.nearPlot = nearest;
      this.prompt.setText(this.label(nearest)).setPosition(nearest.x, nearest.y - 20).setVisible(true);
    } else {
      this.nearPlot = null;
      this.prompt.setVisible(false);
    }
  }

  destroy() {
    this.prompt.destroy();
  }
}
