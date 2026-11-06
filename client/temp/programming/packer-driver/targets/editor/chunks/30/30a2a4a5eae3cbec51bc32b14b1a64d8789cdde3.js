System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, UITransform, GAME, PLAYER_FEET, HAND, ROD_GRIP, FISHING, Sheets, makeNode, makeSprite, hexColor, Player, _crd;

  function playerSheetNames(look) {
    return [`player-spritesheet-skin-${look.skin}`, `player-fishing-skin-${look.skin}`, look.hair > 84 ? 'hair-2-spritesheet' : 'hair-spritesheet', 'tops-spritesheet', 'bottoms-spritesheet', `fishing-top-${look.top}`, `fishing-bottom-${look.bottom}`, 'fishing-rods'];
  }

  function _reportPossibleCrUseOfDir(extras) {
    _reporterNs.report("Dir", "../GameConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfLook(extras) {
    _reporterNs.report("Look", "../GameConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfGAME(extras) {
    _reporterNs.report("GAME", "../GameConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfPLAYER_FEET(extras) {
    _reporterNs.report("PLAYER_FEET", "../GameConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfHAND(extras) {
    _reporterNs.report("HAND", "../GameConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfROD_GRIP(extras) {
    _reporterNs.report("ROD_GRIP", "../GameConfig", _context.meta, extras);
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

  function _reportPossibleCrUseOfhexColor(extras) {
    _reporterNs.report("hexColor", "../core/NodeKit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfCollision(extras) {
    _reporterNs.report("Collision", "./RoomData", _context.meta, extras);
  }

  _export({
    playerSheetNames: playerSheetNames,
    Player: void 0
  });

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      UITransform = _cc.UITransform;
    }, function (_unresolved_2) {
      GAME = _unresolved_2.GAME;
      PLAYER_FEET = _unresolved_2.PLAYER_FEET;
      HAND = _unresolved_2.HAND;
      ROD_GRIP = _unresolved_2.ROD_GRIP;
      FISHING = _unresolved_2.FISHING;
    }, function (_unresolved_3) {
      Sheets = _unresolved_3.Sheets;
    }, function (_unresolved_4) {
      makeNode = _unresolved_4.makeNode;
      makeSprite = _unresolved_4.makeSprite;
      hexColor = _unresolved_4.hexColor;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "21ed7S3tXhLPIrhtwNo/2fa", "Player", undefined); // Nhân vật ghép từ nhiều lớp sprite: thân (màu da) + quần + áo + tóc + cần câu.
      // Quần/áo/tóc trong ảnh là màu xám, được nhuộm bằng Sprite.color.


      __checkObsolete__(['Node', 'Sprite', 'SpriteFrame', 'UITransform']);

      _export("Player", Player = class Player {
        constructor(parent, look, x, y, dir, collision) {
          this.node = void 0;
          this.x = void 0;
          this.y = void 0;
          this.dir = void 0;
          this.mode = 'walk';
          this.moving = false;

          /** Gọi khi animation quăng cần chạy xong. */
          this.onCastDone = null;
          this.body = void 0;
          this.bottom = void 0;
          this.top = void 0;
          this.hair = void 0;
          this.rod = void 0;
          this.sheets = void 0;
          this.t = 0;
          this.castDoneFired = false;
          this.look = look;
          this.collision = collision;
          this.x = x;
          this.y = y;
          this.dir = dir;
          this.node = (_crd && makeNode === void 0 ? (_reportPossibleCrUseOfmakeNode({
            error: Error()
          }), makeNode) : makeNode)('Player', parent);
          const ax = (_crd && PLAYER_FEET === void 0 ? (_reportPossibleCrUseOfPLAYER_FEET({
            error: Error()
          }), PLAYER_FEET) : PLAYER_FEET).x / 48,
                ay = 1 - (_crd && PLAYER_FEET === void 0 ? (_reportPossibleCrUseOfPLAYER_FEET({
            error: Error()
          }), PLAYER_FEET) : PLAYER_FEET).y / 55;
          this.rod = (_crd && makeSprite === void 0 ? (_reportPossibleCrUseOfmakeSprite({
            error: Error()
          }), makeSprite) : makeSprite)('Rod', this.node, null, 0, 1);
          this.body = (_crd && makeSprite === void 0 ? (_reportPossibleCrUseOfmakeSprite({
            error: Error()
          }), makeSprite) : makeSprite)('Body', this.node, null, ax, ay);
          this.bottom = (_crd && makeSprite === void 0 ? (_reportPossibleCrUseOfmakeSprite({
            error: Error()
          }), makeSprite) : makeSprite)('Bottom', this.node, null, ax, ay);
          this.top = (_crd && makeSprite === void 0 ? (_reportPossibleCrUseOfmakeSprite({
            error: Error()
          }), makeSprite) : makeSprite)('Top', this.node, null, ax, ay);
          this.hair = (_crd && makeSprite === void 0 ? (_reportPossibleCrUseOfmakeSprite({
            error: Error()
          }), makeSprite) : makeSprite)('Hair', this.node, null, ax, ay);
          this.bottom.color = (_crd && hexColor === void 0 ? (_reportPossibleCrUseOfhexColor({
            error: Error()
          }), hexColor) : hexColor)(look.bottomColor);
          this.top.color = (_crd && hexColor === void 0 ? (_reportPossibleCrUseOfhexColor({
            error: Error()
          }), hexColor) : hexColor)(look.topColor);
          this.hair.color = (_crd && hexColor === void 0 ? (_reportPossibleCrUseOfhexColor({
            error: Error()
          }), hexColor) : hexColor)(look.hairColor);
          const [body, fish, hair, tops, bottoms, ftop, fbottom, rods] = playerSheetNames(look).map(n => (_crd && Sheets === void 0 ? (_reportPossibleCrUseOfSheets({
            error: Error()
          }), Sheets) : Sheets).get(n));
          this.sheets = {
            body,
            fish,
            hair,
            tops,
            bottoms,
            ftop,
            fbottom,
            rods
          };
          this.rod.node.active = false;
          this.apply();
        }

        get sortY() {
          return this.y;
        }

        setMode(mode) {
          if (this.mode === mode) return;
          this.mode = mode;
          this.t = 0;
          this.castDoneFired = false;
          this.apply();
        }

        face(dir) {
          this.dir = dir;
          this.apply();
        }
        /** Đi theo vector (dx, dy) đã chuẩn hoá, có trượt dọc tường. */


        walk(dx, dy, dt) {
          this.moving = dx !== 0 || dy !== 0;
          if (!this.moving) return;
          if (Math.abs(dx) > Math.abs(dy) + 0.01) this.dir = dx < 0 ? 'left' : 'right';else this.dir = dy < 0 ? 'up' : 'down';
          const sp = (_crd && GAME === void 0 ? (_reportPossibleCrUseOfGAME({
            error: Error()
          }), GAME) : GAME).walkSpeed * dt;
          const hw = (_crd && GAME === void 0 ? (_reportPossibleCrUseOfGAME({
            error: Error()
          }), GAME) : GAME).feetHalfW,
                h = (_crd && GAME === void 0 ? (_reportPossibleCrUseOfGAME({
            error: Error()
          }), GAME) : GAME).feetH;
          const nx = this.x + dx * sp,
                ny = this.y + dy * sp;
          if (this.collision.canStand(nx, this.y, hw, h)) this.x = nx;
          if (this.collision.canStand(this.x, ny, hw, h)) this.y = ny;
        }

        update(dt) {
          this.t += dt;
          this.apply();
          this.node.setPosition(Math.round(this.x), -Math.round(this.y), 0);
        } // -----------------------------------------------------------------------


        set(s, sheet, name) {
          const f = sheet.frame(name);
          if (f && s.spriteFrame !== f) s.spriteFrame = f;
          s.node.active = !!f;
        }

        apply() {
          const {
            body,
            fish,
            hair,
            tops,
            bottoms,
            ftop,
            fbottom,
            rods
          } = this.sheets;
          const L = this.look,
                d = this.dir;
          this.set(this.hair, hair, `player-${d}-0-hair-${L.hair}`);

          if (this.mode === 'walk') {
            const f = this.moving ? Math.floor(this.t * (_crd && GAME === void 0 ? (_reportPossibleCrUseOfGAME({
              error: Error()
            }), GAME) : GAME).walkFps) % 4 : 0;
            this.set(this.body, body, `player-${d}-${f}`);
            this.set(this.bottom, bottoms, `player-${d}-${f}-bottom-${L.bottom}`);
            this.set(this.top, tops, `player-${d}-${f}-top-${L.top}`);
            this.set(this.hair, hair, `player-${d}-${f}-hair-${L.hair}`);
            this.rod.node.active = false;
            return;
          }

          const lvl = (_crd && GAME === void 0 ? (_reportPossibleCrUseOfGAME({
            error: Error()
          }), GAME) : GAME).rodLevel;
          let rodKind;
          let rodFrame;
          let pose; // 'cast-<dir>-<i>' hoặc 'reel-<dir>-<i>'

          let bodyName;

          if (this.mode === 'cast') {
            const j = Math.min(15, Math.floor(this.t * (_crd && FISHING === void 0 ? (_reportPossibleCrUseOfFISHING({
              error: Error()
            }), FISHING) : FISHING).castFps));
            rodKind = 'cast';
            rodFrame = j;
            const i = Math.min(2, Math.floor(j / 2));
            pose = `cast-${d}-${i}`;
            bodyName = `player-fishing-cast-${d}-${i}`;

            if (j >= 15 && !this.castDoneFired) {
              this.castDoneFired = true;
              const cb = this.onCastDone;
              if (cb) setTimeout(cb, 0);
            }
          } else if (this.mode === 'wait' || this.mode === 'hooked') {
            const fps = this.mode === 'hooked' ? 14 : 6;
            rodKind = 'bob';
            rodFrame = Math.floor(this.t * fps) % 6;
            pose = `cast-${d}-2`;
            bodyName = `player-fishing-cast-${d}-2`;
          } else {
            const k = Math.floor(this.t * 12) % 12;
            rodKind = 'reel';
            rodFrame = k;
            pose = `reel-${d}-${k}`;
            bodyName = `player-fishing-reeling-${d}-${k}`;
          }

          this.set(this.body, fish, bodyName);
          this.set(this.top, ftop, `fishing-top-${L.top}-${pose}`);
          this.set(this.bottom, fbottom, `fishing-bottom-${L.bottom}-${pose}`);
          this.set(this.rod, rods, `fishing-rod-level-${lvl}-${rodKind}-${d}-${rodFrame}`); // Đặt cán cần vào tay. Hướng lên: cần nằm sau lưng.

          const [hx, hy] = (_crd && HAND === void 0 ? (_reportPossibleCrUseOfHAND({
            error: Error()
          }), HAND) : HAND)[d];
          const [gx, gy] = (_crd && ROD_GRIP === void 0 ? (_reportPossibleCrUseOfROD_GRIP({
            error: Error()
          }), ROD_GRIP) : ROD_GRIP)[rodKind][d];
          this.rod.node.setPosition(hx - gx - (_crd && PLAYER_FEET === void 0 ? (_reportPossibleCrUseOfPLAYER_FEET({
            error: Error()
          }), PLAYER_FEET) : PLAYER_FEET).x, -(hy - gy - (_crd && PLAYER_FEET === void 0 ? (_reportPossibleCrUseOfPLAYER_FEET({
            error: Error()
          }), PLAYER_FEET) : PLAYER_FEET).y), 0);
          const idx = d === 'up' ? 0 : this.node.children.length - 1;
          if (this.rod.node.getSiblingIndex() !== idx) this.rod.node.setSiblingIndex(idx);
        }
        /** Chiều cao đầu tính từ chân, để đặt nút / tên phía trên. */


        get uiTransform() {
          return this.node.getComponent(UITransform);
        }

      });

      Player.HEAD = 44;

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=30a2a4a5eae3cbec51bc32b14b1a64d8789cdde3.js.map