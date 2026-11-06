System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, Node, Layers, UITransform, Sprite, Label, Color, Graphics, HorizontalTextAlignment, VerticalTextAlignment, _dec, _class, _crd, ccclass, FrameAnim;

  function makeNode(name, parent, x, y) {
    if (x === void 0) {
      x = 0;
    }

    if (y === void 0) {
      y = 0;
    }

    var n = new Node(name);
    n.layer = Layers.Enum.UI_2D;
    n.addComponent(UITransform);
    if (parent) parent.addChild(n);
    n.setPosition(x, y, 0);
    return n;
  }
  /** Đặt layer UI_2D cho cả cây node (node do engine tạo ra như layer của TiledMap). */


  function setLayerDeep(n, layer) {
    if (layer === void 0) {
      layer = Layers.Enum.UI_2D;
    }

    n.layer = layer;

    for (var c of n.children) setLayerDeep(c, layer);
  }

  function makeSprite(name, parent, frame, anchorX, anchorY) {
    if (anchorX === void 0) {
      anchorX = 0.5;
    }

    if (anchorY === void 0) {
      anchorY = 0.5;
    }

    var n = makeNode(name, parent);
    n.getComponent(UITransform).setAnchorPoint(anchorX, anchorY);
    var s = n.addComponent(Sprite);
    s.sizeMode = Sprite.SizeMode.RAW;
    s.trim = false;
    s.spriteFrame = frame;
    return s;
  }

  function makeLabel(name, parent, text, size, color, outline) {
    if (size === void 0) {
      size = 16;
    }

    if (color === void 0) {
      color = Color.WHITE;
    }

    if (outline === void 0) {
      outline = true;
    }

    var n = makeNode(name, parent);
    var l = n.addComponent(Label);
    l.string = text;
    l.fontSize = size;
    l.lineHeight = Math.round(size * 1.25);
    l.color = color.clone();
    l.horizontalAlign = HorizontalTextAlignment.CENTER;
    l.verticalAlign = VerticalTextAlignment.CENTER;

    if (outline) {
      l.enableOutline = true;
      l.outlineColor = new Color(30, 30, 40, 255);
      l.outlineWidth = 2;
    }

    return l;
  }

  function makePanel(name, parent, w, h, fill, stroke) {
    if (fill === void 0) {
      fill = new Color(255, 248, 230, 245);
    }

    if (stroke === void 0) {
      stroke = new Color(92, 64, 40, 255);
    }

    var n = makeNode(name, parent);
    n.getComponent(UITransform).setContentSize(w, h);
    var g = n.addComponent(Graphics);
    drawPanel(g, w, h, fill, stroke);
    return g;
  }

  function drawPanel(g, w, h, fill, stroke) {
    g.clear();
    g.lineWidth = 4;
    g.fillColor = fill;
    g.strokeColor = stroke;
    g.roundRect(-w / 2, -h / 2, w, h, 10);
    g.fill();
    g.stroke();
  }

  function hexColor(hex) {
    var c = new Color();
    Color.fromHEX(c, hex);
    return c;
  }
  /** Chạy một dãy SpriteFrame trên Sprite cùng node. */


  _export({
    makeNode: makeNode,
    setLayerDeep: setLayerDeep,
    makeSprite: makeSprite,
    makeLabel: makeLabel,
    makePanel: makePanel,
    drawPanel: drawPanel,
    hexColor: hexColor
  });

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      _decorator = _cc._decorator;
      Component = _cc.Component;
      Node = _cc.Node;
      Layers = _cc.Layers;
      UITransform = _cc.UITransform;
      Sprite = _cc.Sprite;
      Label = _cc.Label;
      Color = _cc.Color;
      Graphics = _cc.Graphics;
      HorizontalTextAlignment = _cc.HorizontalTextAlignment;
      VerticalTextAlignment = _cc.VerticalTextAlignment;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "c126aKzfflGCayfZBLsbKnc", "NodeKit", undefined); // Tiện ích tạo node 2D bằng code (scene được dựng hoàn toàn lúc chạy).


      __checkObsolete__(['_decorator', 'Component', 'Node', 'Layers', 'UITransform', 'Sprite', 'SpriteFrame', 'Label', 'Color', 'Graphics', 'HorizontalTextAlignment', 'VerticalTextAlignment']);

      ({
        ccclass
      } = _decorator);

      _export("FrameAnim", FrameAnim = (_dec = ccclass('FrameAnim'), _dec(_class = class FrameAnim extends Component {
        constructor() {
          super(...arguments);
          this.frames = [];
          this.fps = 8;
          this.loop = true;
          this.playing = false;
          this.t = 0;
          this.i = 0;
          this.onDone = null;
          this.sprite = null;
        }

        play(frames, fps, loop, onDone) {
          if (loop === void 0) {
            loop = true;
          }

          if (onDone === void 0) {
            onDone = null;
          }

          this.sprite = this.sprite || this.getComponent(Sprite);
          this.frames = frames;
          this.fps = fps;
          this.loop = loop;
          this.onDone = onDone;
          this.t = 0;
          this.i = 0;
          this.playing = frames.length > 1 && fps > 0;
          if (this.sprite && frames.length) this.sprite.spriteFrame = frames[0];
        }
        /** Bắt đầu ở một frame ngẫu nhiên để các decor giống nhau không chạy đồng loạt. */


        randomizePhase() {
          if (this.frames.length > 1) {
            this.i = Math.floor(Math.random() * this.frames.length);
            if (this.sprite) this.sprite.spriteFrame = this.frames[this.i];
          }
        }

        update(dt) {
          if (!this.playing || !this.sprite) return;
          this.t += dt;
          var step = 1 / this.fps;
          var changed = false;

          while (this.t >= step) {
            this.t -= step;
            this.i++;
            changed = true;

            if (this.i >= this.frames.length) {
              if (this.loop) this.i = 0;else {
                this.i = this.frames.length - 1;
                this.playing = false;
                var cb = this.onDone;
                this.onDone = null;
                this.sprite.spriteFrame = this.frames[this.i];
                if (cb) cb();
                return;
              }
            }
          }

          if (changed) this.sprite.spriteFrame = this.frames[this.i];
        }

      }) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=3e2f0ca1570c78688355a010aab31d56334a61d9.js.map