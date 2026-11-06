System.register(["__unresolved_0", "cc"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, Collision, _crd;

  function distToRect(px, py, r) {
    const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
    const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
    return Math.sqrt(dx * dx + dy * dy);
  }

  function _reportPossibleCrUseOfDir(extras) {
    _reporterNs.report("Dir", "../GameConfig", _context.meta, extras);
  }

  _export({
    Collision: void 0,
    distToRect: distToRect
  });

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "3aad0uVtDZOjoT9V4ut7dTR", "RoomData", undefined); // Dữ liệu phòng do tools/build-room.mjs ghi vào assets/resources/rooms/<room>.json.
      // Toạ độ đều theo pixel của Tiled: gốc ở góc trên trái map, trục y hướng xuống.


      /** Va chạm: ô "blocked" của Tiled + hình chữ nhật collider + vật cản thêm lúc chạy (NPC). */
      _export("Collision", Collision = class Collision {
        constructor(room) {
          this.extra = [];
          this.room = room;
        }

        addBlocker(r) {
          this.extra.push(r);
        }

        tileBlocked(tx, ty) {
          const {
            cols,
            rows,
            blocked
          } = this.room;
          if (tx < 0 || ty < 0 || tx >= cols || ty >= rows) return true;
          return blocked.charCodeAt(ty * cols + tx) === 49; // '1'
        }
        /** Hộp chân [x-hw, x+hw] x [y-h, y] có đứng được không. */


        canStand(x, y, hw, h) {
          const {
            tileW,
            tileH
          } = this.room;
          const x0 = Math.floor((x - hw) / tileW),
                x1 = Math.floor((x + hw) / tileW);
          const y0 = Math.floor((y - h) / tileH),
                y1 = Math.floor(y / tileH);

          for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.tileBlocked(tx, ty)) return false;

          const hit = r => x + hw > r.x && x - hw < r.x + r.w && y > r.y && y - h < r.y + r.h;

          for (const r of this.room.colliders) if (hit(r)) return false;

          for (const r of this.extra) if (hit(r)) return false;

          return true;
        }

      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=0a318191237740468ab138a0f07fe6410f96b38b.js.map