System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, Sprite, UITransform, Color, Sheets, makeNode, makeSprite, makeLabel, FrameAnim, Npc, _crd;

  function _reportPossibleCrUseOfNpcDef(extras) {
    _reporterNs.report("NpcDef", "../GameConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfSheets(extras) {
    _reporterNs.report("Sheets", "../core/Sheets", _context.meta, extras);
  }

  function _reportPossibleCrUseOfmakeNode(extras) {
    _reporterNs.report("makeNode", "../core/NodeKit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfmakeSprite(extras) {
    _reporterNs.report("makeSprite", "../core/NodeKit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfmakeLabel(extras) {
    _reporterNs.report("makeLabel", "../core/NodeKit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfFrameAnim(extras) {
    _reporterNs.report("FrameAnim", "../core/NodeKit", _context.meta, extras);
  }

  _export("Npc", void 0);

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      Sprite = _cc.Sprite;
      UITransform = _cc.UITransform;
      Color = _cc.Color;
    }, function (_unresolved_2) {
      Sheets = _unresolved_2.Sheets;
    }, function (_unresolved_3) {
      makeNode = _unresolved_3.makeNode;
      makeSprite = _unresolved_3.makeSprite;
      makeLabel = _unresolved_3.makeLabel;
      FrameAnim = _unresolved_3.FrameAnim;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "129beE3f+9Dcbjp77h0g1y3", "Npc", undefined); // NPC: animation idle từ sheet npc-<tên>, bảng tên và dấu nhiệm vụ trên đầu.


      __checkObsolete__(['Node', 'Sprite', 'UITransform', 'Color']);

      _export("Npc", Npc = class Npc {
        constructor(def, entities, worldUi) {
          this.node = void 0;

          /** Node gắn ở lớp UI của thế giới (tên, dấu nhiệm vụ), đi theo NPC. */
          this.overhead = void 0;
          this.height = void 0;
          this.def = def;
          const sheet = (_crd && Sheets === void 0 ? (_reportPossibleCrUseOfSheets({
            error: Error()
          }), Sheets) : Sheets).get(def.sheet);
          const frames = sheet.frames(sheet.order);
          const h = frames[0].originalSize.height;
          this.height = h;
          this.node = (_crd && makeNode === void 0 ? (_reportPossibleCrUseOfmakeNode({
            error: Error()
          }), makeNode) : makeNode)('Npc-' + def.id, entities, def.x, -def.y);
          const s = (_crd && makeSprite === void 0 ? (_reportPossibleCrUseOfmakeSprite({
            error: Error()
          }), makeSprite) : makeSprite)('Sprite', this.node, frames[0], 0.5, 2 / h);
          const anim = s.node.addComponent(_crd && FrameAnim === void 0 ? (_reportPossibleCrUseOfFrameAnim({
            error: Error()
          }), FrameAnim) : FrameAnim);
          anim.play(frames, def.fps, true); // Tên + dấu nhiệm vụ

          this.overhead = (_crd && makeNode === void 0 ? (_reportPossibleCrUseOfmakeNode({
            error: Error()
          }), makeNode) : makeNode)('Overhead-' + def.id, worldUi, def.x, -(def.y - h - 2));
          const tag = (_crd && Sheets === void 0 ? (_reportPossibleCrUseOfSheets({
            error: Error()
          }), Sheets) : Sheets).tryGet('ui-npc-name-tag');
          let bg = null;

          if (tag) {
            const sf = tag.first();
            sf.insetLeft = sf.insetRight = 4;
            sf.insetTop = sf.insetBottom = 3;
            bg = (_crd && makeSprite === void 0 ? (_reportPossibleCrUseOfmakeSprite({
              error: Error()
            }), makeSprite) : makeSprite)('NameTag', this.overhead, sf, 0.5, 0.5);
            bg.type = Sprite.Type.SLICED;
            bg.sizeMode = Sprite.SizeMode.CUSTOM;
          }

          const label = (_crd && makeLabel === void 0 ? (_reportPossibleCrUseOfmakeLabel({
            error: Error()
          }), makeLabel) : makeLabel)('Name', this.overhead, def.name, 16, new Color(255, 255, 255, 255), true);
          label.node.setScale(0.5, 0.5, 1);

          if (bg) {
            label.updateRenderData(true);
            const tw = label.node.getComponent(UITransform).width * 0.5;
            bg.node.getComponent(UITransform).setContentSize(Math.max(29, Math.ceil(tw) + 8), 12);
          }

          if (def.quest) {
            const markers = (_crd && Sheets === void 0 ? (_reportPossibleCrUseOfSheets({
              error: Error()
            }), Sheets) : Sheets).tryGet('ui-quest-markers');

            if (markers) {
              const prefix = def.quest === 'offer' ? 'unrepeatableIncomplete' : def.quest === 'progress' ? 'questInProgress' : 'questComplete';
              const seq = markers.sequence(prefix);
              const m = (_crd && makeSprite === void 0 ? (_reportPossibleCrUseOfmakeSprite({
                error: Error()
              }), makeSprite) : makeSprite)('QuestMarker', this.overhead, seq[0], 0.5, 0);
              m.node.setPosition(0, 8, 0);
              m.node.addComponent(_crd && FrameAnim === void 0 ? (_reportPossibleCrUseOfFrameAnim({
                error: Error()
              }), FrameAnim) : FrameAnim).play(seq, 10, true);
            }
          }
        }

        get x() {
          return this.def.x;
        }

        get y() {
          return this.def.y;
        }

        get sortY() {
          return this.def.y;
        }

      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=ff8cedf1b69775c33db6bc24b1e82f8c172ca6ca.js.map