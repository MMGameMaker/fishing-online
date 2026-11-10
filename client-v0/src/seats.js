import Phaser from 'phaser';
import { request } from './net.js';

const REACH = 36;

// Shows a "Sit" button over the nearest free seat, and a "Stand" button once seated.
export class SeatController {
  constructor(scene, session) {
    this.scene = scene;
    this.session = session;
    this.seats = session.room.seats;
    this.sitButton = scene.add.image(0, 0, 'ref_buttons', 'sitButton').setScale(1.1)
      .setDepth(3400).setVisible(false).setInteractive({ useHandCursor: true });
    this.sitButton.on('pointerover', () => this.sitButton.setTint(0xffe2b0));
    this.sitButton.on('pointerout', () => this.sitButton.clearTint());
    this.sitButton.on('pointerdown', (_p, _x, _y, event) => { event.stopPropagation(); this.sitDown(); });

    this.standButton = scene.add.text(0, 0, 'Stand up', {
      fontFamily: 'Trebuchet MS, Verdana, sans-serif', fontSize: '13px', color: '#2b2438', backgroundColor: '#fff8e7',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 1).setResolution(2).setDepth(3400).setVisible(false).setInteractive({ useHandCursor: true });
    this.standButton.on('pointerover', () => this.standButton.setBackgroundColor('#f3e6c8'));
    this.standButton.on('pointerout', () => this.standButton.setBackgroundColor('#fff8e7'));
    this.standButton.on('pointerdown', (_p, _x, _y, event) => { event.stopPropagation(); this.standUp(); });
  }

  nearestSeat(me) {
    let best = null, bestDist = Infinity;
    this.seats.forEach((seat, index) => {
      const d = Phaser.Math.Distance.Between(me.x, me.y, seat.x, seat.y);
      if (d < bestDist) { bestDist = d; best = index; }
    });
    return bestDist <= REACH ? best : -1;
  }

  async sitDown() {
    if (this.session.sitting || this.session.fishing.isFishing()) return;
    const index = this.nearestSeat(this.session.world.me);
    if (index < 0) return;
    // Coral Cove phải thuê ghế trước, thuê xong mới ngồi xuống.
    if (this.scene.online) {
      this.scene.online.pressSeatIndex(index);
      return;
    }
    await request('sitDown', { index });
  }

  async standUp() {
    if (!this.session.sitting) return;
    await request('standUp');
  }

  update(me, busy) {
    if (this.session.sitting) {
      this.sitButton.setVisible(false);
      // While fishing from a stool the Fish button takes this spot; stand up once done.
      // On a stool by the water the Fish button sits at y - 84, so Stand up goes above it.
      const above = this.session.fishZone ? 112 : 84;
      // Coral Cove rời ghế bằng phím di chuyển hoặc nút Rời ghế trên HUD (SPEC 0.9).
      this.standButton.setVisible(!this.session.fishing.isFishing() && !this.scene.online).setPosition(me.x, me.y - above);
      return;
    }
    this.standButton.setVisible(false);
    const index = !busy && !me.moving ? this.nearestSeat(me) : -1;
    if (index >= 0) {
      const seat = this.seats[index];
      this.sitButton.setVisible(true).setPosition(seat.x, seat.y - 30);
    } else {
      this.sitButton.setVisible(false);
    }
  }

  destroy() {
    this.sitButton.destroy();
    this.standButton.destroy();
  }
}
