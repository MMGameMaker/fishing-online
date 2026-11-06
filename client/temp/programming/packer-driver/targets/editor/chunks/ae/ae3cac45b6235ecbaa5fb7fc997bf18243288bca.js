System.register(["__unresolved_0", "cc", "__unresolved_1"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, Node, Graphics, Color, UITransform, Label, view, makeNode, makeLabel, makeSprite, FishingPopup, _crd, W, TITLE_H, BLACK, WHITE, GREEN, GREEN_DARK;

  function _reportPossibleCrUseOfmakeNode(extras) {
    _reporterNs.report("makeNode", "../core/NodeKit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfmakeLabel(extras) {
    _reporterNs.report("makeLabel", "../core/NodeKit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfmakeSprite(extras) {
    _reporterNs.report("makeSprite", "../core/NodeKit", _context.meta, extras);
  }

  _export("FishingPopup", void 0);

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      Node = _cc.Node;
      Graphics = _cc.Graphics;
      Color = _cc.Color;
      UITransform = _cc.UITransform;
      Label = _cc.Label;
      view = _cc.view;
    }, function (_unresolved_2) {
      makeNode = _unresolved_2.makeNode;
      makeLabel = _unresolved_2.makeLabel;
      makeSprite = _unresolved_2.makeSprite;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "26bf2bYoHBKYLFN4lz2j9k4", "FishingPopup", undefined); // Popup kết quả câu cá: khung trắng viền đen, thanh tiêu đề đen chữ trắng, nút xanh lá.
      // Dùng cho MISS / OOPS (kéo sớm) / OOPS (thua minigame) / SUCCESS.


      __checkObsolete__(['Node', 'Graphics', 'Color', 'EventTouch', 'UITransform', 'Label', 'Sprite', 'SpriteFrame', 'view']);

      W = 460;
      TITLE_H = 44;
      BLACK = new Color(28, 28, 32, 255);
      WHITE = new Color(255, 255, 255, 255);
      GREEN = new Color(46, 204, 138, 255);
      GREEN_DARK = new Color(30, 150, 100, 255);

      _export("FishingPopup", FishingPopup = class FishingPopup {
        get active() {
          return this.node.active;
        }

        constructor(parent) {
          this.node = void 0;
          this.box = void 0;
          this.bg = void 0;
          this.title = void 0;
          this.body = void 0;
          this.icon = void 0;
          this.btn = void 0;
          this.btnG = void 0;
          this.btnLabel = void 0;
          this.h = 220;
          this.onClose = null;
          this.onUiTouch = null;
          this.node = (_crd && makeNode === void 0 ? (_reportPossibleCrUseOfmakeNode({
            error: Error()
          }), makeNode) : makeNode)('FishingPopup', parent); // Chặn chạm phía sau popup.

          this.node.getComponent(UITransform).setContentSize(4000, 4000);
          this.node.on(Node.EventType.TOUCH_START, e => {
            this.touched();
            e.propagationStopped = true;
          });
          this.node.on(Node.EventType.TOUCH_END, e => {
            this.touched();
            e.propagationStopped = true;
          });
          this.box = (_crd && makeNode === void 0 ? (_reportPossibleCrUseOfmakeNode({
            error: Error()
          }), makeNode) : makeNode)('Box', this.node);
          this.bg = this.box.addComponent(Graphics);
          this.title = (_crd && makeLabel === void 0 ? (_reportPossibleCrUseOfmakeLabel({
            error: Error()
          }), makeLabel) : makeLabel)('Title', this.box, '', 24, WHITE, false);
          this.body = (_crd && makeLabel === void 0 ? (_reportPossibleCrUseOfmakeLabel({
            error: Error()
          }), makeLabel) : makeLabel)('Body', this.box, '', 18, BLACK, false);
          this.body.overflow = Label.Overflow.RESIZE_HEIGHT;
          this.body.node.getComponent(UITransform).width = W - 48;
          this.icon = (_crd && makeSprite === void 0 ? (_reportPossibleCrUseOfmakeSprite({
            error: Error()
          }), makeSprite) : makeSprite)('Icon', this.box, null, 0.5, 0.5);
          this.icon.node.setScale(3, 3, 1);
          this.btn = (_crd && makeNode === void 0 ? (_reportPossibleCrUseOfmakeNode({
            error: Error()
          }), makeNode) : makeNode)('OkButton', this.box);
          this.btnG = this.btn.addComponent(Graphics);
          this.btnLabel = (_crd && makeLabel === void 0 ? (_reportPossibleCrUseOfmakeLabel({
            error: Error()
          }), makeLabel) : makeLabel)('Text', this.btn, '', 20, WHITE, false);
          this.btn.on(Node.EventType.TOUCH_START, e => {
            this.touched();
            e.propagationStopped = true;
            this.drawButton(true);
          });
          this.btn.on(Node.EventType.TOUCH_END, e => {
            this.touched();
            e.propagationStopped = true;
            this.drawButton(false);
            this.close();
          });
          this.btn.on(Node.EventType.TOUCH_CANCEL, () => this.drawButton(false));
          this.node.active = false;
        }

        show(title, text, button, icon, onClose = null) {
          var _updateRenderData, _ref;

          this.onClose = onClose;
          this.title.string = title;
          this.body.string = text;
          this.btnLabel.string = button;
          this.icon.spriteFrame = icon;
          this.icon.node.active = !!icon;
          this.node.active = true; // Đo chiều cao chữ rồi xếp các phần từ trên xuống.

          (_updateRenderData = (_ref = this.body).updateRenderData) == null || _updateRenderData.call(_ref, true);
          const textH = Math.max(24, this.body.node.getComponent(UITransform).height);
          const iconH = icon ? 90 : 0;
          this.h = TITLE_H + 18 + textH + (icon ? 12 + iconH : 0) + 18 + 46 + 18;
          const top = this.h / 2;
          this.title.node.setPosition(0, top - TITLE_H / 2, 0);
          let y = top - TITLE_H - 18;
          this.body.node.getComponent(UITransform).setAnchorPoint(0.5, 1);
          this.body.node.setPosition(0, y, 0);
          y -= textH;

          if (icon) {
            y -= 12;
            this.icon.node.setPosition(0, y - iconH / 2, 0);
            y -= iconH;
          }

          y -= 18;
          this.btn.setPosition(0, y - 23, 0);
          this.btn.getComponent(UITransform).setContentSize(220, 46);
          this.box.getComponent(UITransform).setContentSize(W, this.h);
          this.drawBox();
          this.drawButton(false);
          const vs = view.getVisibleSize(); // Giữa, hơi lệch xuống dưới như trong game gốc.

          this.box.setPosition(0, -vs.height / 2 + this.h / 2 + 40, 0);
        }

        close() {
          if (!this.node.active) return;
          this.node.active = false;
          const cb = this.onClose;
          this.onClose = null;
          if (cb) cb();
        }

        touched() {
          if (this.onUiTouch) this.onUiTouch();
        }

        drawBox() {
          const g = this.bg,
                h = this.h;
          g.clear();
          g.lineWidth = 4;
          g.fillColor = WHITE;
          g.strokeColor = BLACK;
          g.roundRect(-W / 2, -h / 2, W, h, 12);
          g.fill();
          g.stroke();
          g.fillColor = BLACK;
          g.roundRect(-W / 2, h / 2 - TITLE_H, W, TITLE_H, 12);
          g.fill();
          g.rect(-W / 2, h / 2 - TITLE_H, W, 12);
          g.fill();
        }

        drawButton(pressed) {
          const g = this.btnG;
          g.clear();
          g.fillColor = pressed ? GREEN_DARK : GREEN;
          g.strokeColor = GREEN_DARK;
          g.lineWidth = 3;
          g.roundRect(-110, -23, 220, 46, 10);
          g.fill();
          g.stroke();
        }

      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=ae3cac45b6235ecbaa5fb7fc997bf18243288bca.js.map