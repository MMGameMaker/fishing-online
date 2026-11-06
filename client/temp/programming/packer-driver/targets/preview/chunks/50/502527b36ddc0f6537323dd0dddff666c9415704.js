System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, resources, ImageAsset, JsonAsset, Texture2D, SpriteFrame, Rect, Size, Vec2, Sheet, Sheets, _crd;

  function loadRes(path, type) {
    return new Promise((resolve, reject) => {
      resources.load(path, type, (err, asset) => {
        if (err) reject(new Error("Kh\xF4ng n\u1EA1p \u0111\u01B0\u1EE3c resources/" + path + ": " + err.message));else resolve(asset);
      });
    });
  }

  _export({
    Sheet: void 0,
    Sheets: void 0,
    loadRes: loadRes
  });

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      resources = _cc.resources;
      ImageAsset = _cc.ImageAsset;
      JsonAsset = _cc.JsonAsset;
      Texture2D = _cc.Texture2D;
      SpriteFrame = _cc.SpriteFrame;
      Rect = _cc.Rect;
      Size = _cc.Size;
      Vec2 = _cc.Vec2;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "ca094gADDVD2JSAYDRzFC6K", "Sheets", undefined); // Nạp sprite sheet từ assets/resources/sheets/<tên>.png + <tên>-frames.json
      // (định dạng do tools/build-room.mjs ghi ra) và cắt thành SpriteFrame khi cần.


      __checkObsolete__(['resources', 'ImageAsset', 'JsonAsset', 'Texture2D', 'SpriteFrame', 'Rect', 'Size', 'Vec2']);

      _export("Sheet", Sheet = class Sheet {
        constructor(name, texture, data) {
          this.cache = new Map();
          this.name = name;
          this.texture = texture;
          this.data = data;
        }

        get order() {
          return this.data.order;
        }

        has(frame) {
          return !!this.data.frames[frame];
        }

        frame(frame) {
          var sf = this.cache.get(frame);
          if (sf) return sf;
          var r = this.data.frames[frame];
          if (!r) return null;
          sf = new SpriteFrame();
          sf.reset({
            texture: this.texture,
            rect: new Rect(r[0], r[1], r[2], r[3]),
            originalSize: new Size(r[2], r[3]),
            offset: new Vec2(0, 0),
            isRotate: false
          });
          this.cache.set(frame, sf);
          return sf;
        }
        /** Frame đầu tiên (dùng cho ảnh tĩnh một frame). */


        first() {
          return this.frame(this.data.order[0]);
        }

        frames(names) {
          return names.map(n => this.frame(n)).filter(f => !!f);
        }
        /** Các frame tên dạng `${prefix}0`, `${prefix}1`... theo thứ tự số. */


        sequence(prefix, count) {
          var out = [];

          for (var i = 0; count === undefined || i < count; i++) {
            var f = this.frame(prefix + i);
            if (!f) break;
            out.push(f);
          }

          return out;
        }

      });

      _export("Sheets", Sheets = class Sheets {
        static get(name) {
          var s = this.loaded.get(name);
          if (!s) throw new Error("Sheet ch\u01B0a n\u1EA1p: " + name);
          return s;
        }

        static tryGet(name) {
          return this.loaded.get(name);
        }

        static load(name) {
          var done = this.loaded.get(name);
          if (done) return Promise.resolve(done);
          var p = this.pending.get(name);
          if (p) return p;
          p = Promise.all([loadRes("sheets/" + name, ImageAsset), loadRes("sheets/" + name + "-frames", JsonAsset)]).then(_ref => {
            var [img, json] = _ref;
            var tex = new Texture2D();
            tex.image = img;
            tex.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
            tex.setMipFilter(Texture2D.Filter.NONE);
            tex.setWrapMode(Texture2D.WrapMode.CLAMP_TO_EDGE, Texture2D.WrapMode.CLAMP_TO_EDGE);
            var sheet = new Sheet(name, tex, json.json);
            this.loaded.set(name, sheet);
            return sheet;
          });
          this.pending.set(name, p);
          return p;
        }

        static loadAll(names) {
          return Promise.all([...new Set(names)].map(n => this.load(n)));
        }

      });

      Sheets.loaded = new Map();
      Sheets.pending = new Map();

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=502527b36ddc0f6537323dd0dddff666c9415704.js.map