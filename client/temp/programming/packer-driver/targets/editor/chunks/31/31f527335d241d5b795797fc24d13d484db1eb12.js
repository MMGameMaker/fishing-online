System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, Node, Sprite, Graphics, Color, UITransform, view, FISHING, Sheets, makeNode, makeSprite, FrameAnim, FishingMinigame, _crd, BASE_W, BASE_H, BAR, COUNTER, BUTTON, TIMER, P;

  function zoneFrame() {
    const lvl = Math.min(5, Math.max(1, Math.round((_crd && FISHING === void 0 ? (_reportPossibleCrUseOfFISHING({
      error: Error()
    }), FISHING) : FISHING).zoneLevel)));
    return P + 'zone-' + lvl;
  }

  function _reportPossibleCrUseOfFISHING(extras) {
    _reporterNs.report("FISHING", "../GameConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfSheets(extras) {
    _reporterNs.report("Sheets", "../core/Sheets", _context.meta, extras);
  }

  function _reportPossibleCrUseOfSheet(extras) {
    _reporterNs.report("Sheet", "../core/Sheets", _context.meta, extras);
  }

  function _reportPossibleCrUseOfmakeNode(extras) {
    _reporterNs.report("makeNode", "../core/NodeKit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfmakeSprite(extras) {
    _reporterNs.report("makeSprite", "../core/NodeKit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfFrameAnim(extras) {
    _reporterNs.report("FrameAnim", "../core/NodeKit", _context.meta, extras);
  }

  _export("FishingMinigame", void 0);

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      Node = _cc.Node;
      Sprite = _cc.Sprite;
      Graphics = _cc.Graphics;
      Color = _cc.Color;
      UITransform = _cc.UITransform;
      view = _cc.view;
    }, function (_unresolved_2) {
      FISHING = _unresolved_2.FISHING;
    }, function (_unresolved_3) {
      Sheets = _unresolved_3.Sheets;
    }, function (_unresolved_4) {
      makeNode = _unresolved_4.makeNode;
      makeSprite = _unresolved_4.makeSprite;
      FrameAnim = _unresolved_4.FrameAnim;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "2d1ad0DPmpAKJ9ihXNVzokt", "FishingMinigame", undefined); // Minigame REEL: con trỏ cá chạy qua lại trên thanh nước, bấm REEL khi con trỏ nằm trong vùng xanh.
      // Đủ FISHING.hitsNeeded lần là thắng. Bấm trượt MỘT lần là thua ngay. Hết giờ cũng thua.
      // Dùng sprite sheet fishing-interface (bảng nền, bong bóng, vùng xanh, con trỏ, bộ đếm, nút REEL, thanh giờ).


      __checkObsolete__(['Node', 'Sprite', 'Graphics', 'Color', 'EventTouch', 'UITransform', 'view']);

      // Toạ độ trong frame fishing-interface-base (302x289, gốc trên trái, y hướng xuống).
      BASE_W = 302;
      BASE_H = 289;
      BAR = {
        x: 12,
        y: 48,
        w: 278,
        h: 43
      };
      COUNTER = {
        x: 11,
        y: 118
      };
      BUTTON = {
        x: 130,
        y: 118,
        w: 161,
        h: 58
      };
      TIMER = {
        x: 18,
        y: 261,
        w: 265,
        h: 9
      };
      P = 'fishing-interface-';

      _export("FishingMinigame", FishingMinigame = class FishingMinigame {
        constructor(parent) {
          this.node = void 0;
          this.active = false;
          this.sheet = void 0;
          this.panel = void 0;
          this.bubbles = void 0;
          this.zone = void 0;
          this.cursor = void 0;
          this.counter = void 0;
          this.button = void 0;
          this.timer = void 0;
          this.confettiRoot = void 0;
          this.confetti = [];
          this.hits = 0;
          this.timeLeft = 0;
          this.cursorX = 0;
          // 0..1 dọc thanh
          this.cursorDir = 1;
          this.zoneX = 0;
          // mép trái vùng xanh, toạ độ pixel trong thanh
          this.zoneW = 0;
          this.finishing = 0;
          // > 0: đang đếm ngược để đóng bảng
          this.result = null;
          this.hover = false;
          this.pressed = false;
          this.bubbleT = 0;
          this.onDone = null;

          /** Gọi mỗi khi có thao tác trên bảng (để RoomScene bỏ qua lần chạm toàn cục). */
          this.onUiTouch = null;
          this.scheduleZoneMove = 0;
          this.sheet = (_crd && Sheets === void 0 ? (_reportPossibleCrUseOfSheets({
            error: Error()
          }), Sheets) : Sheets).get('fishing-interface');
          this.node = (_crd && makeNode === void 0 ? (_reportPossibleCrUseOfmakeNode({
            error: Error()
          }), makeNode) : makeNode)('ReelMinigame', parent); // Lớp chặn toàn màn hình: nuốt mọi lần chạm ngoài bảng để không ai đi lung tung khi đang thu dây.

          const blocker = this.node.getComponent(UITransform);
          blocker.setContentSize(4000, 4000);
          this.node.on(Node.EventType.TOUCH_START, e => {
            this.touched();
            e.propagationStopped = true;
          });
          this.node.on(Node.EventType.TOUCH_END, e => {
            this.touched();
            e.propagationStopped = true;
          });
          this.panel = (_crd && makeNode === void 0 ? (_reportPossibleCrUseOfmakeNode({
            error: Error()
          }), makeNode) : makeNode)('Panel', this.node);
          const base = (_crd && makeSprite === void 0 ? (_reportPossibleCrUseOfmakeSprite({
            error: Error()
          }), makeSprite) : makeSprite)('Base', this.panel, this.sheet.frame(P + 'base'), 0.5, 0.5);
          base.node.name = 'Base';
          this.bubbles = this.place('Bubbles', P + 'bubbles-0', BAR.x, BAR.y);
          this.zone = this.place('Zone', zoneFrame(), BAR.x, BAR.y - 1);
          this.counter = this.place('Counter', P + 'reel-counter-0', COUNTER.x, COUNTER.y);
          this.button = this.place('ReelButton', P + 'reel-button', BUTTON.x, BUTTON.y);
          this.timer = this.place('Timer', P + 'timer-green', TIMER.x, TIMER.y);
          this.timer.type = Sprite.Type.FILLED;
          this.timer.fillType = Sprite.FillType.HORIZONTAL;
          this.timer.fillStart = 0;
          this.timer.fillRange = 1;
          this.timer.sizeMode = Sprite.SizeMode.CUSTOM;
          this.timer.node.getComponent(UITransform).setContentSize(TIMER.w, TIMER.h); // Con trỏ: frame 35x97, tâm dọc trùng tâm thanh nước.

          this.cursor = (_crd && makeSprite === void 0 ? (_reportPossibleCrUseOfmakeSprite({
            error: Error()
          }), makeSprite) : makeSprite)('Cursor', this.panel, this.sheet.frame(P + 'slider-tick-0'), 0.5, 0.5);
          this.cursor.node.addComponent(_crd && FrameAnim === void 0 ? (_reportPossibleCrUseOfFrameAnim({
            error: Error()
          }), FrameAnim) : FrameAnim);
          const bn = this.button.node;
          bn.on(Node.EventType.MOUSE_ENTER, () => {
            this.hover = true;
            this.refreshButton();
          });
          bn.on(Node.EventType.MOUSE_LEAVE, () => {
            this.hover = false;
            this.pressed = false;
            this.refreshButton();
          });
          bn.on(Node.EventType.TOUCH_START, e => {
            this.touched();
            e.propagationStopped = true;
            this.pressed = true;
            this.refreshButton();
          });
          bn.on(Node.EventType.TOUCH_END, e => {
            this.touched();
            e.propagationStopped = true;
            this.pressed = false;
            this.refreshButton();
            this.reel();
          });
          bn.on(Node.EventType.TOUCH_CANCEL, () => {
            this.pressed = false;
            this.refreshButton();
          });
          this.confettiRoot = (_crd && makeNode === void 0 ? (_reportPossibleCrUseOfmakeNode({
            error: Error()
          }), makeNode) : makeNode)('Confetti', this.node);
          this.node.active = false;
        }

        open(onDone) {
          this.onDone = onDone;
          this.hits = 0;
          this.timeLeft = (_crd && FISHING === void 0 ? (_reportPossibleCrUseOfFISHING({
            error: Error()
          }), FISHING) : FISHING).reelTime;
          this.cursorX = 0;
          this.cursorDir = 1;
          this.finishing = 0;
          this.result = null;
          this.pressed = false;
          this.clearConfetti();
          this.zone.spriteFrame = this.sheet.frame(zoneFrame());
          this.zoneW = this.zone.spriteFrame ? this.zone.spriteFrame.rect.width : 66;
          this.moveZone();
          this.counter.spriteFrame = this.sheet.frame(P + 'reel-counter-0');
          this.cursor.getComponent(_crd && FrameAnim === void 0 ? (_reportPossibleCrUseOfFrameAnim({
            error: Error()
          }), FrameAnim) : FrameAnim).playing = false;
          this.cursor.spriteFrame = this.sheet.frame(P + 'slider-tick-0');
          this.refreshButton();
          this.layout();
          this.node.active = true;
          this.active = true;
          this.update(0);
        }
        /** Bấm REEL (nút, hoặc phím Space / F / Enter). */


        reel() {
          if (!this.active || this.finishing > 0) return;
          const px = BAR.x + this.cursorX * BAR.w;
          const inZone = px >= this.zoneX && px <= this.zoneX + this.zoneW;
          const anim = this.cursor.getComponent(_crd && FrameAnim === void 0 ? (_reportPossibleCrUseOfFrameAnim({
            error: Error()
          }), FrameAnim) : FrameAnim);

          if (inZone) {
            this.hits++;
            this.counter.spriteFrame = this.sheet.frame(P + 'reel-counter-' + Math.min(3, this.hits));
            anim.play(this.sheet.sequence(P + 'slider-tick-'), 24, false);

            if (this.hits >= (_crd && FISHING === void 0 ? (_reportPossibleCrUseOfFISHING({
              error: Error()
            }), FISHING) : FISHING).hitsNeeded) {
              this.finish('win', (_crd && FISHING === void 0 ? (_reportPossibleCrUseOfFISHING({
                error: Error()
              }), FISHING) : FISHING).winDelay);
              this.spawnConfetti();
            } else {
              // Vùng xanh nhảy chỗ khác sau khi trúng.
              this.scheduleZoneMove = (_crd && FISHING === void 0 ? (_reportPossibleCrUseOfFISHING({
                error: Error()
              }), FISHING) : FISHING).zoneMoveDelay;
            }
          } else {
            // Trượt một lần là thua ngay.
            anim.play(this.sheet.sequence(P + 'slider-cross-'), 24, false);
            this.finish('miss', (_crd && FISHING === void 0 ? (_reportPossibleCrUseOfFISHING({
              error: Error()
            }), FISHING) : FISHING).failDelay);
          }
        }

        update(dt) {
          if (!this.active) return;
          this.layout();
          this.updateConfetti(dt);
          this.bubbleT += dt;
          const bf = this.sheet.frame(P + 'bubbles-' + Math.floor(this.bubbleT * 8) % 10);
          if (bf && this.bubbles.spriteFrame !== bf) this.bubbles.spriteFrame = bf;

          if (this.finishing > 0) {
            this.finishing -= dt;
            if (this.finishing <= 0) this.close();
            return;
          }

          if (this.scheduleZoneMove > 0) {
            this.scheduleZoneMove -= dt;

            if (this.scheduleZoneMove <= 0) {
              this.moveZone();
              const anim = this.cursor.getComponent(_crd && FrameAnim === void 0 ? (_reportPossibleCrUseOfFrameAnim({
                error: Error()
              }), FrameAnim) : FrameAnim);
              anim.playing = false;
              this.cursor.spriteFrame = this.sheet.frame(P + 'slider-tick-0');
            }
          } // Con trỏ chạy qua lại (ping-pong), FISHING.cursorSweep giây cho một lượt.


          this.cursorX += this.cursorDir * dt / (_crd && FISHING === void 0 ? (_reportPossibleCrUseOfFISHING({
            error: Error()
          }), FISHING) : FISHING).cursorSweep;

          if (this.cursorX >= 1) {
            this.cursorX = 2 - this.cursorX;
            this.cursorDir = -1;
          }

          if (this.cursorX <= 0) {
            this.cursorX = -this.cursorX;
            this.cursorDir = 1;
          }

          this.cursor.node.setPosition(BAR.x + this.cursorX * BAR.w - BASE_W / 2, BASE_H / 2 - (BAR.y + BAR.h / 2), 0);
          this.timeLeft -= dt;
          const k = Math.max(0, this.timeLeft / (_crd && FISHING === void 0 ? (_reportPossibleCrUseOfFISHING({
            error: Error()
          }), FISHING) : FISHING).reelTime);
          this.timer.fillRange = k;
          const tf = this.sheet.frame(P + (k > 0.5 ? 'timer-green' : k > 0.2 ? 'timer-orange' : 'timer-red'));
          if (tf && this.timer.spriteFrame !== tf) this.timer.spriteFrame = tf;
          if (this.timeLeft <= 0) this.finish('timeout', (_crd && FISHING === void 0 ? (_reportPossibleCrUseOfFISHING({
            error: Error()
          }), FISHING) : FISHING).failDelay);
        } // -----------------------------------------------------------------------


        touched() {
          if (this.onUiTouch) this.onUiTouch();
        }

        place(name, frame, x, y) {
          const s = (_crd && makeSprite === void 0 ? (_reportPossibleCrUseOfmakeSprite({
            error: Error()
          }), makeSprite) : makeSprite)(name, this.panel, this.sheet.frame(frame), 0, 1);
          s.node.setPosition(x - BASE_W / 2, BASE_H / 2 - y, 0);
          return s;
        }

        moveZone() {
          const prev = this.zoneX;
          const maxX = BAR.x + BAR.w - this.zoneW;
          let x = BAR.x; // Chọn chỗ mới cách chỗ cũ ít nhất một bề rộng vùng để người chơi phải canh lại.

          for (let i = 0; i < 8; i++) {
            x = BAR.x + Math.random() * (maxX - BAR.x);
            if (Math.abs(x - prev) > this.zoneW) break;
          }

          this.zoneX = Math.round(x);
          this.zone.node.setPosition(this.zoneX - BASE_W / 2, BASE_H / 2 - (BAR.y - 1), 0);
        }

        refreshButton() {
          const suffix = this.pressed ? '-pressed' : this.hover ? '-hover' : '';
          const f = this.sheet.frame(P + 'reel-button' + suffix);
          if (f) this.button.spriteFrame = f;
        }

        finish(r, delay) {
          this.result = r;
          this.finishing = Math.max(0.01, delay);
        }

        close() {
          this.active = false;
          this.node.active = false;
          this.clearConfetti();
          const cb = this.onDone;
          this.onDone = null;
          if (cb && this.result) cb(this.result);
        }

        layout() {
          const vs = view.getVisibleSize();
          const s = Math.max(1, Math.min(2, (vs.height - 40) / BASE_H, (vs.width - 40) / BASE_W));
          this.panel.setScale(s, s, 1);
          this.panel.setPosition(0, 0, 0);
        } // Pháo giấy khi thắng -------------------------------------------------


        spawnConfetti() {
          const colors = [new Color(255, 82, 82), new Color(255, 196, 0), new Color(64, 196, 255), new Color(124, 77, 255), new Color(0, 230, 118), new Color(255, 128, 171)];
          const s = this.panel.scale.x;

          for (let i = 0; i < 70; i++) {
            const n = (_crd && makeNode === void 0 ? (_reportPossibleCrUseOfmakeNode({
              error: Error()
            }), makeNode) : makeNode)('c', this.confettiRoot);
            const g = n.addComponent(Graphics);
            g.fillColor = colors[i % colors.length];
            const w = 4 + Math.random() * 5,
                  h = 8 + Math.random() * 8;
            g.rect(-w / 2, -h / 2, w, h);
            g.fill();
            n.setPosition((Math.random() - 0.5) * BASE_W * s * 0.6, (BAR.y - BASE_H / 2) * -s, 0);
            const a = Math.random() * Math.PI * 2,
                  sp = 250 + Math.random() * 450;
            this.confetti.push({
              g: n,
              vx: Math.cos(a) * sp,
              vy: Math.abs(Math.sin(a)) * sp + 150,
              vr: (Math.random() - 0.5) * 900
            });
          }
        }

        updateConfetti(dt) {
          for (const c of this.confetti) {
            c.vy -= 900 * dt;
            const p = c.g.position;
            c.g.setPosition(p.x + c.vx * dt, p.y + c.vy * dt, 0);
            c.g.angle += c.vr * dt;
          }
        }

        clearConfetti() {
          for (const c of this.confetti) c.g.destroy();

          this.confetti = [];
        }

      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=31f527335d241d5b795797fc24d13d484db1eb12.js.map