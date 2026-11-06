System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3", "__unresolved_4", "__unresolved_5", "__unresolved_6", "__unresolved_7", "__unresolved_8"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, Node, JsonAsset, TiledMap, TiledMapAsset, UITransform, Vec3, Color, Graphics, input, Input, KeyCode, view, Label, UIOpacity, Texture2D, GAME, PLAYER_LOOK, PLAYER_NAME, ROOM_NPCS, CATCH_TABLE, FISHING, FISHING_TEXT, FishingMinigame, FishingPopup, Sheets, loadRes, makeNode, makeSprite, makeLabel, makePanel, setLayerDeep, FrameAnim, Collision, distToRect, Player, playerSheetNames, Npc, _dec, _dec2, _dec3, _dec4, _class, _class2, _descriptor, _descriptor2, _descriptor3, _crd, ccclass, property, UI_SHEETS, RoomScene;

  function _initializerDefineProperty(target, property, descriptor, context) { if (!descriptor) return; Object.defineProperty(target, property, { enumerable: descriptor.enumerable, configurable: descriptor.configurable, writable: descriptor.writable, value: descriptor.initializer ? descriptor.initializer.call(context) : void 0 }); }

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'transform-class-properties is enabled and runs after the decorators transform.'); }

  function _reportPossibleCrUseOfDir(extras) {
    _reporterNs.report("Dir", "./GameConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfGAME(extras) {
    _reporterNs.report("GAME", "./GameConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfPLAYER_LOOK(extras) {
    _reporterNs.report("PLAYER_LOOK", "./GameConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfPLAYER_NAME(extras) {
    _reporterNs.report("PLAYER_NAME", "./GameConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfROOM_NPCS(extras) {
    _reporterNs.report("ROOM_NPCS", "./GameConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfCATCH_TABLE(extras) {
    _reporterNs.report("CATCH_TABLE", "./GameConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfFISHING(extras) {
    _reporterNs.report("FISHING", "./GameConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfFISHING_TEXT(extras) {
    _reporterNs.report("FISHING_TEXT", "./GameConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfNpcDef(extras) {
    _reporterNs.report("NpcDef", "./GameConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfFishingMinigame(extras) {
    _reporterNs.report("FishingMinigame", "./fishing/FishingMinigame", _context.meta, extras);
  }

  function _reportPossibleCrUseOfReelResult(extras) {
    _reporterNs.report("ReelResult", "./fishing/FishingMinigame", _context.meta, extras);
  }

  function _reportPossibleCrUseOfFishingPopup(extras) {
    _reporterNs.report("FishingPopup", "./fishing/FishingPopup", _context.meta, extras);
  }

  function _reportPossibleCrUseOfSheets(extras) {
    _reporterNs.report("Sheets", "./core/Sheets", _context.meta, extras);
  }

  function _reportPossibleCrUseOfloadRes(extras) {
    _reporterNs.report("loadRes", "./core/Sheets", _context.meta, extras);
  }

  function _reportPossibleCrUseOfmakeNode(extras) {
    _reporterNs.report("makeNode", "./core/NodeKit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfmakeSprite(extras) {
    _reporterNs.report("makeSprite", "./core/NodeKit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfmakeLabel(extras) {
    _reporterNs.report("makeLabel", "./core/NodeKit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfmakePanel(extras) {
    _reporterNs.report("makePanel", "./core/NodeKit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfsetLayerDeep(extras) {
    _reporterNs.report("setLayerDeep", "./core/NodeKit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfFrameAnim(extras) {
    _reporterNs.report("FrameAnim", "./core/NodeKit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfRoomData(extras) {
    _reporterNs.report("RoomData", "./world/RoomData", _context.meta, extras);
  }

  function _reportPossibleCrUseOfCollision(extras) {
    _reporterNs.report("Collision", "./world/RoomData", _context.meta, extras);
  }

  function _reportPossibleCrUseOfdistToRect(extras) {
    _reporterNs.report("distToRect", "./world/RoomData", _context.meta, extras);
  }

  function _reportPossibleCrUseOfTeleportData(extras) {
    _reporterNs.report("TeleportData", "./world/RoomData", _context.meta, extras);
  }

  function _reportPossibleCrUseOfRectData(extras) {
    _reporterNs.report("RectData", "./world/RoomData", _context.meta, extras);
  }

  function _reportPossibleCrUseOfPlayer(extras) {
    _reporterNs.report("Player", "./world/Player", _context.meta, extras);
  }

  function _reportPossibleCrUseOfplayerSheetNames(extras) {
    _reporterNs.report("playerSheetNames", "./world/Player", _context.meta, extras);
  }

  function _reportPossibleCrUseOfNpc(extras) {
    _reporterNs.report("Npc", "./world/Npc", _context.meta, extras);
  }

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      _decorator = _cc._decorator;
      Component = _cc.Component;
      Node = _cc.Node;
      JsonAsset = _cc.JsonAsset;
      TiledMap = _cc.TiledMap;
      TiledMapAsset = _cc.TiledMapAsset;
      UITransform = _cc.UITransform;
      Vec3 = _cc.Vec3;
      Color = _cc.Color;
      Graphics = _cc.Graphics;
      input = _cc.input;
      Input = _cc.Input;
      KeyCode = _cc.KeyCode;
      view = _cc.view;
      Label = _cc.Label;
      UIOpacity = _cc.UIOpacity;
      Texture2D = _cc.Texture2D;
    }, function (_unresolved_2) {
      GAME = _unresolved_2.GAME;
      PLAYER_LOOK = _unresolved_2.PLAYER_LOOK;
      PLAYER_NAME = _unresolved_2.PLAYER_NAME;
      ROOM_NPCS = _unresolved_2.ROOM_NPCS;
      CATCH_TABLE = _unresolved_2.CATCH_TABLE;
      FISHING = _unresolved_2.FISHING;
      FISHING_TEXT = _unresolved_2.FISHING_TEXT;
    }, function (_unresolved_3) {
      FishingMinigame = _unresolved_3.FishingMinigame;
    }, function (_unresolved_4) {
      FishingPopup = _unresolved_4.FishingPopup;
    }, function (_unresolved_5) {
      Sheets = _unresolved_5.Sheets;
      loadRes = _unresolved_5.loadRes;
    }, function (_unresolved_6) {
      makeNode = _unresolved_6.makeNode;
      makeSprite = _unresolved_6.makeSprite;
      makeLabel = _unresolved_6.makeLabel;
      makePanel = _unresolved_6.makePanel;
      setLayerDeep = _unresolved_6.setLayerDeep;
      FrameAnim = _unresolved_6.FrameAnim;
    }, function (_unresolved_7) {
      Collision = _unresolved_7.Collision;
      distToRect = _unresolved_7.distToRect;
    }, function (_unresolved_8) {
      Player = _unresolved_8.Player;
      playerSheetNames = _unresolved_8.playerSheetNames;
    }, function (_unresolved_9) {
      Npc = _unresolved_9.Npc;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "e1d405G9e5C7LZVtgvTZOaP", "RoomScene", undefined); // Component chính: gắn vào node Canvas. Dựng toàn bộ phòng lúc chạy từ
      // assets/resources/rooms/<room>.json + 2 file TMX + các sprite sheet.
      //
      // Thứ tự vẽ (dưới lên trên):
      //   map dưới (nước, đất) → decor nhóm objectsBelow → [decor objectsAbove + NPC + người chơi, sắp theo y]
      //   → map trên (objects foreground, mây) → UI trong thế giới (tên, nút) → HUD màn hình


      __checkObsolete__(['_decorator', 'Component', 'Node', 'JsonAsset', 'TiledMap', 'TiledMapAsset', 'UITransform', 'Vec3', 'Color', 'Graphics', 'input', 'Input', 'EventKeyboard', 'KeyCode', 'EventTouch', 'view', 'Sprite', 'Label', 'UIOpacity', 'Texture2D', 'SpriteFrame']);

      ({
        ccclass,
        property
      } = _decorator); // Luồng câu cá (theo video Coral Cove):
      //   idle (nút cá trên đầu) → request (đồng hồ cát ~1s) → cast (quăng cần) → wait (7-15s, bấm = kéo sớm, thua)
      //   → bite (dấu !, 1.5s để bấm bất kỳ đâu, hết giờ = trượt) → hooking (màn tối 1.5s)
      //   → reel (minigame: 3 lần trúng vùng xanh, trượt 1 lần = thua ngay, hết giờ = thua)
      //   → reveal (thẻ cá bay lên, bọt nước, hiện cá) → popup SUCCESS → idle

      UI_SHEETS = ['ui-buttons', 'ui-quest-markers', 'ui-npc-name-tag', 'fishing-caught', 'fishing-hooked-alert', 'fishing-interface', 'menu-inventory-icon', 'menu-quests-icon', 'menu-settings-icon', 'menu-help-icon'];

      _export("RoomScene", RoomScene = (_dec = ccclass('RoomScene'), _dec2 = property({
        tooltip: 'Tên map trong assets/resources/rooms (chạy tools/build-room.mjs để tạo)'
      }), _dec3 = property({
        tooltip: 'Độ phóng pixel art'
      }), _dec4 = property({
        tooltip: 'Vẽ ô chặn, vùng câu, cổng (bật/tắt bằng phím B khi chạy)'
      }), _dec(_class = (_class2 = class RoomScene extends Component {
        constructor(...args) {
          super(...args);

          _initializerDefineProperty(this, "roomName", _descriptor, this);

          _initializerDefineProperty(this, "zoom", _descriptor2, this);

          _initializerDefineProperty(this, "showDebug", _descriptor3, this);

          this.room = void 0;
          this.collision = void 0;
          this.world = void 0;
          this.mapRoot = void 0;
          this.entities = void 0;
          this.worldUi = void 0;
          this.hud = void 0;
          this.debugGfx = null;
          this.player = void 0;
          this.npcs = [];
          this.sortables = [];
          this.bounds = {
            x: 0,
            y: 0,
            w: 0,
            h: 0
          };
          // Input
          this.keys = new Set();
          this.moveTarget = null;
          this.stuckT = 0;
          this.lastUiTouch = 0;
          // Nút hành động trên đầu
          this.actionBtn = void 0;
          this.actionKind = null;
          this.actionTarget = null;
          this.btnHover = false;
          this.btnPressed = false;
          this.playerTag = void 0;
          this.alert = void 0;
          // Câu cá
          this.fish = 'idle';
          this.fishT = 0;
          this.fishZone = null;
          this.bag = new Map();
          this.minigame = void 0;
          this.result = void 0;
          this.dim = void 0;
          this.dimOpacity = void 0;
          this.dimTarget = 0;
          this.reveal = void 0;
          this.revealCard = void 0;
          this.revealSplash = void 0;
          this.revealIcon = void 0;
          this.catchInfo = null;
          // HUD
          this.toast = void 0;
          this.toastT = 0;
          this.dialog = void 0;
          this.dialogName = void 0;
          this.dialogText = void 0;
          this.dialogPortrait = void 0;
          this.dialogLines = [];
          this.dialogIdx = 0;
          this.infoPanel = void 0;
          this.infoLabel = void 0;
          this.bagLabel = void 0;
          this.loading = void 0;
          this.ready = false;
          this.viewW = 0;
          this.viewH = 0;
        }

        // -----------------------------------------------------------------------
        // Dựng scene
        // -----------------------------------------------------------------------
        start() {
          // Node này nằm ở tâm Canvas; cần UITransform để đổi toạ độ chạm.
          if (!this.node.getComponent(UITransform)) this.node.addComponent(UITransform);
          this.loading = (_crd && makeLabel === void 0 ? (_reportPossibleCrUseOfmakeLabel({
            error: Error()
          }), makeLabel) : makeLabel)('Loading', this.node, 'Đang tải Coral Cove...', 28);
          this.build().catch(e => {
            console.error(e);
            this.loading.string = 'Lỗi khi tải scene:\n' + ((e == null ? void 0 : e.message) || e);
            this.loading.fontSize = 18;
          });
        }

        onDestroy() {
          input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
          input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
          input.off(Input.EventType.TOUCH_START, this.onTouch, this);
        }

        async build() {
          const json = await (_crd && loadRes === void 0 ? (_reportPossibleCrUseOfloadRes({
            error: Error()
          }), loadRes) : loadRes)(`rooms/${this.roomName}`, JsonAsset);
          const room = this.room = json.json;
          this.collision = new (_crd && Collision === void 0 ? (_reportPossibleCrUseOfCollision({
            error: Error()
          }), Collision) : Collision)(room);
          this.bounds = this.computeBounds(room);
          const npcDefs = (_crd && ROOM_NPCS === void 0 ? (_reportPossibleCrUseOfROOM_NPCS({
            error: Error()
          }), ROOM_NPCS) : ROOM_NPCS)[room.name] || [];
          const sheetNames = [...room.decor.map(d => d.sheet), ...(_crd && playerSheetNames === void 0 ? (_reportPossibleCrUseOfplayerSheetNames({
            error: Error()
          }), playerSheetNames) : playerSheetNames)(_crd && PLAYER_LOOK === void 0 ? (_reportPossibleCrUseOfPLAYER_LOOK({
            error: Error()
          }), PLAYER_LOOK) : PLAYER_LOOK), ...npcDefs.map(n => n.sheet), ...npcDefs.filter(n => n.portrait).map(n => n.portrait), ...UI_SHEETS];
          const [below, above] = await Promise.all([(_crd && loadRes === void 0 ? (_reportPossibleCrUseOfloadRes({
            error: Error()
          }), loadRes) : loadRes)(room.maps.below, TiledMapAsset), room.maps.above ? (_crd && loadRes === void 0 ? (_reportPossibleCrUseOfloadRes({
            error: Error()
          }), loadRes) : loadRes)(room.maps.above, TiledMapAsset) : Promise.resolve(null), (_crd && Sheets === void 0 ? (_reportPossibleCrUseOfSheets({
            error: Error()
          }), Sheets) : Sheets).loadAll(sheetNames)]); // Cây node của thế giới. mapRoot: gốc toạ độ = góc trên trái map, y âm hướng xuống.

          this.world = (_crd && makeNode === void 0 ? (_reportPossibleCrUseOfmakeNode({
            error: Error()
          }), makeNode) : makeNode)('World', this.node);
          this.world.setScale(this.zoom, this.zoom, 1);
          this.mapRoot = (_crd && makeNode === void 0 ? (_reportPossibleCrUseOfmakeNode({
            error: Error()
          }), makeNode) : makeNode)('MapRoot', this.world);
          this.addTiledMap('TilesBelow', below);
          const belowDecor = (_crd && makeNode === void 0 ? (_reportPossibleCrUseOfmakeNode({
            error: Error()
          }), makeNode) : makeNode)('DecorBelow', this.mapRoot);
          this.entities = (_crd && makeNode === void 0 ? (_reportPossibleCrUseOfmakeNode({
            error: Error()
          }), makeNode) : makeNode)('Entities', this.mapRoot);
          if (above) this.addTiledMap('TilesAbove', above);
          this.worldUi = (_crd && makeNode === void 0 ? (_reportPossibleCrUseOfmakeNode({
            error: Error()
          }), makeNode) : makeNode)('WorldUI', this.mapRoot);

          for (const d of room.decor) {
            const parent = d.layer === 'below' ? belowDecor : this.entities;
            const sheet = (_crd && Sheets === void 0 ? (_reportPossibleCrUseOfSheets({
              error: Error()
            }), Sheets) : Sheets).get(d.sheet);
            const frames = sheet.frames(d.frames);
            if (!frames.length) continue;
            const s = (_crd && makeSprite === void 0 ? (_reportPossibleCrUseOfmakeSprite({
              error: Error()
            }), makeSprite) : makeSprite)(d.name, parent, frames[0], 0, 1);
            s.node.setPosition(d.x, -d.y, 0);
            if (d.opacity < 1) s.node.addComponent(UIOpacity).opacity = Math.round(d.opacity * 255);

            if (frames.length > 1 && d.fps > 0) {
              const a = s.node.addComponent(_crd && FrameAnim === void 0 ? (_reportPossibleCrUseOfFrameAnim({
                error: Error()
              }), FrameAnim) : FrameAnim);
              a.play(frames, d.fps, d.loop);
              if (d.loop) a.randomizePhase();
            }

            if (d.layer === 'above') this.sortables.push({
              node: s.node,
              sortY: () => d.sortY
            });
          }

          for (const def of npcDefs) {
            const npc = new (_crd && Npc === void 0 ? (_reportPossibleCrUseOfNpc({
              error: Error()
            }), Npc) : Npc)(def, this.entities, this.worldUi);
            this.npcs.push(npc);
            this.sortables.push({
              node: npc.node,
              sortY: () => npc.sortY
            });
            this.collision.addBlocker({
              x: def.x - 10,
              y: def.y - 8,
              w: 20,
              h: 9
            });
          }

          const sp = room.spawn;
          this.player = new (_crd && Player === void 0 ? (_reportPossibleCrUseOfPlayer({
            error: Error()
          }), Player) : Player)(this.entities, _crd && PLAYER_LOOK === void 0 ? (_reportPossibleCrUseOfPLAYER_LOOK({
            error: Error()
          }), PLAYER_LOOK) : PLAYER_LOOK, sp.x, sp.y, sp.dir, this.collision);
          this.sortables.push({
            node: this.player.node,
            sortY: () => this.player.sortY
          });

          this.player.onCastDone = () => this.onCastDone();

          this.buildWorldUi();
          this.buildHud();
          this.debugGfx = (_crd && makeNode === void 0 ? (_reportPossibleCrUseOfmakeNode({
            error: Error()
          }), makeNode) : makeNode)('Debug', this.mapRoot).addComponent(Graphics);
          this.drawDebug();
          input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
          input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
          input.on(Input.EventType.TOUCH_START, this.onTouch, this);
          this.loading.node.destroy();
          this.ready = true;
          this.player.update(0);
          this.updateCamera();
          this.showToast('Coral Cove', 2);
        }

        addTiledMap(name, asset) {
          for (const sf of asset.spriteFrames) {
            const tex = sf == null ? void 0 : sf.texture;
            if (tex && tex.setFilters) tex.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
          }

          const n = (_crd && makeNode === void 0 ? (_reportPossibleCrUseOfmakeNode({
            error: Error()
          }), makeNode) : makeNode)(name, this.mapRoot);
          const tm = n.addComponent(TiledMap);
          tm.tmxAsset = asset;
          (_crd && setLayerDeep === void 0 ? (_reportPossibleCrUseOfsetLayerDeep({
            error: Error()
          }), setLayerDeep) : setLayerDeep)(n); // Đưa góc trên trái của map về gốc toạ độ của mapRoot.

          const ut = n.getComponent(UITransform);
          n.setPosition(ut.width * ut.anchorX, -ut.height * (1 - ut.anchorY), 0);
        }
        /** Vùng có tile thật sự (để camera không lộ phần map trống). */


        computeBounds(room) {
          const b = room.bounds;
          if (b) return b;
          return {
            x: 0,
            y: 0,
            w: room.pxW,
            h: room.pxH
          };
        }

        buildWorldUi() {
          const btns = (_crd && Sheets === void 0 ? (_reportPossibleCrUseOfSheets({
            error: Error()
          }), Sheets) : Sheets).get('ui-buttons');
          this.actionBtn = (_crd && makeSprite === void 0 ? (_reportPossibleCrUseOfmakeSprite({
            error: Error()
          }), makeSprite) : makeSprite)('ActionButton', this.worldUi, btns.frame('fishButton'), 0.5, 0);
          const bn = this.actionBtn.node;
          bn.active = false;
          bn.on(Node.EventType.MOUSE_ENTER, () => {
            this.btnHover = true;
            this.refreshButtonFrame();
          });
          bn.on(Node.EventType.MOUSE_LEAVE, () => {
            this.btnHover = false;
            this.btnPressed = false;
            this.refreshButtonFrame();
          });
          bn.on(Node.EventType.TOUCH_START, e => {
            this.lastUiTouch = Date.now();
            this.btnPressed = true;
            this.refreshButtonFrame();
            e.propagationStopped = true;
          });
          bn.on(Node.EventType.TOUCH_END, e => {
            this.lastUiTouch = Date.now();
            this.btnPressed = false;
            this.refreshButtonFrame();
            e.propagationStopped = true;
            this.doAction();
          });
          bn.on(Node.EventType.TOUCH_CANCEL, () => {
            this.btnPressed = false;
            this.refreshButtonFrame();
          });
          this.playerTag = (_crd && makeNode === void 0 ? (_reportPossibleCrUseOfmakeNode({
            error: Error()
          }), makeNode) : makeNode)('PlayerName', this.worldUi);
          const l = (_crd && makeLabel === void 0 ? (_reportPossibleCrUseOfmakeLabel({
            error: Error()
          }), makeLabel) : makeLabel)('Label', this.playerTag, _crd && PLAYER_NAME === void 0 ? (_reportPossibleCrUseOfPLAYER_NAME({
            error: Error()
          }), PLAYER_NAME) : PLAYER_NAME, 16, new Color(255, 255, 255, 255));
          l.node.setScale(0.5, 0.5, 1);
          const alertSheet = (_crd && Sheets === void 0 ? (_reportPossibleCrUseOfSheets({
            error: Error()
          }), Sheets) : Sheets).get('fishing-hooked-alert');
          this.alert = (_crd && makeSprite === void 0 ? (_reportPossibleCrUseOfmakeSprite({
            error: Error()
          }), makeSprite) : makeSprite)('HookedAlert', this.worldUi, alertSheet.first(), 0.5, 0);
          this.alert.node.addComponent(_crd && FrameAnim === void 0 ? (_reportPossibleCrUseOfFrameAnim({
            error: Error()
          }), FrameAnim) : FrameAnim);
          this.alert.node.active = false; // Thẻ cá: base 0..6 là thẻ bay lên từ mặt nước rồi treo trên lưỡi câu (frame 51x68).

          const caught = (_crd && Sheets === void 0 ? (_reportPossibleCrUseOfSheets({
            error: Error()
          }), Sheets) : Sheets).get('fishing-caught');
          this.reveal = (_crd && makeNode === void 0 ? (_reportPossibleCrUseOfmakeNode({
            error: Error()
          }), makeNode) : makeNode)('CatchReveal', this.worldUi);
          this.revealCard = (_crd && makeSprite === void 0 ? (_reportPossibleCrUseOfmakeSprite({
            error: Error()
          }), makeSprite) : makeSprite)('Card', this.reveal, caught.frame('fishing-caught-base-0'), 0.5, 0);
          this.revealCard.node.addComponent(_crd && FrameAnim === void 0 ? (_reportPossibleCrUseOfFrameAnim({
            error: Error()
          }), FrameAnim) : FrameAnim); // Tâm phần thẻ trắng trong frame cuối: (14, 50) tính từ góc trên trái → so với điểm neo (25.5, 68).

          this.revealIcon = (_crd && makeSprite === void 0 ? (_reportPossibleCrUseOfmakeSprite({
            error: Error()
          }), makeSprite) : makeSprite)('Fish', this.reveal, null, 0.5, 0.5);
          this.revealIcon.node.setPosition(-11.5, 18, 0);
          this.revealSplash = (_crd && makeSprite === void 0 ? (_reportPossibleCrUseOfmakeSprite({
            error: Error()
          }), makeSprite) : makeSprite)('Splash', this.reveal, null, 0.5, 0.5);
          this.revealSplash.node.setPosition(-11.5, 18, 0);
          this.revealSplash.node.addComponent(_crd && FrameAnim === void 0 ? (_reportPossibleCrUseOfFrameAnim({
            error: Error()
          }), FrameAnim) : FrameAnim);
          this.reveal.active = false;
        }

        buildHud() {
          this.hud = (_crd && makeNode === void 0 ? (_reportPossibleCrUseOfmakeNode({
            error: Error()
          }), makeNode) : makeNode)('HUD', this.node);
          this.toast = (_crd && makeLabel === void 0 ? (_reportPossibleCrUseOfmakeLabel({
            error: Error()
          }), makeLabel) : makeLabel)('Toast', this.hud, '', 30, new Color(255, 244, 200, 255));
          this.toast.node.active = false; // Thanh menu góc phải

          const menu = (_crd && makeNode === void 0 ? (_reportPossibleCrUseOfmakeNode({
            error: Error()
          }), makeNode) : makeNode)('Menu', this.hud);
          menu.name = 'Menu';
          const items = [['menu-inventory-icon', 'Túi', () => this.toggleInfo('bag')], ['menu-quests-icon', 'Nhiệm vụ', () => this.toggleInfo('quests')], ['menu-settings-icon', 'Debug', () => {
            this.showDebug = !this.showDebug;
            this.drawDebug();
          }], ['menu-help-icon', 'Hướng dẫn', () => this.toggleInfo('help')]];
          items.forEach(([sheet,, fn], i) => {
            const s = (_crd && makeSprite === void 0 ? (_reportPossibleCrUseOfmakeSprite({
              error: Error()
            }), makeSprite) : makeSprite)(sheet, menu, (_crd && Sheets === void 0 ? (_reportPossibleCrUseOfSheets({
              error: Error()
            }), Sheets) : Sheets).get(sheet).first(), 0.5, 0.5);
            s.node.setPosition(-i * 52, 0, 0);
            s.node.on(Node.EventType.TOUCH_END, e => {
              this.lastUiTouch = Date.now();
              e.propagationStopped = true;
              fn();
            });
            s.node.on(Node.EventType.TOUCH_START, e => {
              this.lastUiTouch = Date.now();
              e.propagationStopped = true;
            });
          });
          this.bagLabel = (_crd && makeLabel === void 0 ? (_reportPossibleCrUseOfmakeLabel({
            error: Error()
          }), makeLabel) : makeLabel)('BagCount', menu, '0', 14);
          this.bagLabel.node.setPosition(14, -16, 0);
          const title = (_crd && makeLabel === void 0 ? (_reportPossibleCrUseOfmakeLabel({
            error: Error()
          }), makeLabel) : makeLabel)('Title', this.hud, 'Coral Cove', 22, new Color(255, 255, 255, 255));
          title.node.name = 'Title';
          const hint = (_crd && makeLabel === void 0 ? (_reportPossibleCrUseOfmakeLabel({
            error: Error()
          }), makeLabel) : makeLabel)('Hint', this.hud, 'WASD / mũi tên hoặc chạm để đi  •  F / Space: câu cá  •  E: nói chuyện  •  B: debug', 15, new Color(235, 245, 255, 255));
          hint.node.name = 'Hint'; // Hộp thoại NPC

          this.dialog = (_crd && makeNode === void 0 ? (_reportPossibleCrUseOfmakeNode({
            error: Error()
          }), makeNode) : makeNode)('Dialog', this.hud);
          (_crd && makePanel === void 0 ? (_reportPossibleCrUseOfmakePanel({
            error: Error()
          }), makePanel) : makePanel)('Bg', this.dialog, 760, 170);
          this.dialogPortrait = (_crd && makeSprite === void 0 ? (_reportPossibleCrUseOfmakeSprite({
            error: Error()
          }), makeSprite) : makeSprite)('Portrait', this.dialog, null, 0.5, 0.5);
          this.dialogPortrait.node.setPosition(-300, 0, 0);
          this.dialogPortrait.node.setScale(0.85, 0.85, 1);
          this.dialogName = (_crd && makeLabel === void 0 ? (_reportPossibleCrUseOfmakeLabel({
            error: Error()
          }), makeLabel) : makeLabel)('Name', this.dialog, '', 22, new Color(120, 70, 30, 255), false);
          this.dialogName.node.getComponent(UITransform).setAnchorPoint(0, 0.5);
          this.dialogName.horizontalAlign = Label.HorizontalAlign.LEFT;
          this.dialogName.node.setPosition(-200, 55, 0);
          this.dialogText = (_crd && makeLabel === void 0 ? (_reportPossibleCrUseOfmakeLabel({
            error: Error()
          }), makeLabel) : makeLabel)('Text', this.dialog, '', 20, new Color(60, 40, 30, 255), false);
          this.dialogText.overflow = Label.Overflow.RESIZE_HEIGHT;
          this.dialogText.horizontalAlign = Label.HorizontalAlign.LEFT;
          const tut = this.dialogText.node.getComponent(UITransform);
          tut.setAnchorPoint(0, 1);
          tut.width = 540;
          this.dialogText.node.setPosition(-200, 35, 0);
          const more = (_crd && makeLabel === void 0 ? (_reportPossibleCrUseOfmakeLabel({
            error: Error()
          }), makeLabel) : makeLabel)('More', this.dialog, 'Bấm để tiếp ▸', 14, new Color(150, 110, 70, 255), false);
          more.node.setPosition(300, -62, 0);
          this.dialog.on(Node.EventType.TOUCH_END, e => {
            this.lastUiTouch = Date.now();
            e.propagationStopped = true;
            this.advanceDialog();
          });
          this.dialog.getComponent(UITransform).setContentSize(760, 170);
          this.dialog.active = false; // Bảng thông tin (túi, nhiệm vụ, hướng dẫn)

          this.infoPanel = (_crd && makeNode === void 0 ? (_reportPossibleCrUseOfmakeNode({
            error: Error()
          }), makeNode) : makeNode)('Info', this.hud);
          (_crd && makePanel === void 0 ? (_reportPossibleCrUseOfmakePanel({
            error: Error()
          }), makePanel) : makePanel)('Bg', this.infoPanel, 420, 300);
          this.infoLabel = (_crd && makeLabel === void 0 ? (_reportPossibleCrUseOfmakeLabel({
            error: Error()
          }), makeLabel) : makeLabel)('Text', this.infoPanel, '', 18, new Color(60, 40, 30, 255), false);
          this.infoLabel.overflow = Label.Overflow.RESIZE_HEIGHT;
          this.infoLabel.node.getComponent(UITransform).width = 380;
          this.infoPanel.getComponent(UITransform).setContentSize(420, 300);
          this.infoPanel.on(Node.EventType.TOUCH_END, e => {
            this.lastUiTouch = Date.now();
            e.propagationStopped = true;
            this.infoPanel.active = false;
          });
          this.infoPanel.active = false; // Màn tối khi móc được cá + minigame REEL + popup kết quả (nằm trên cùng).

          this.dim = (_crd && makeNode === void 0 ? (_reportPossibleCrUseOfmakeNode({
            error: Error()
          }), makeNode) : makeNode)('Dim', this.hud);
          const dg = this.dim.addComponent(Graphics);
          dg.fillColor = new Color(0, 0, 0, 128);
          dg.rect(-3000, -3000, 6000, 6000);
          dg.fill();
          this.dimOpacity = this.dim.addComponent(UIOpacity);
          this.dimOpacity.opacity = 0;
          this.dim.active = false;
          this.minigame = new (_crd && FishingMinigame === void 0 ? (_reportPossibleCrUseOfFishingMinigame({
            error: Error()
          }), FishingMinigame) : FishingMinigame)(this.hud);

          this.minigame.onUiTouch = () => {
            this.lastUiTouch = Date.now();
          };

          this.result = new (_crd && FishingPopup === void 0 ? (_reportPossibleCrUseOfFishingPopup({
            error: Error()
          }), FishingPopup) : FishingPopup)(this.hud);

          this.result.onUiTouch = () => {
            this.lastUiTouch = Date.now();
          };

          this.layoutHud();
        }

        layoutHud() {
          const vs = view.getVisibleSize();
          if (vs.width === this.viewW && vs.height === this.viewH) return;
          this.viewW = vs.width;
          this.viewH = vs.height;
          const W = vs.width / 2,
                H = vs.height / 2;
          this.hud.getChildByName('Menu').setPosition(W - 40, H - 40, 0);
          const title = this.hud.getChildByName('Title');
          title.getComponent(UITransform).setAnchorPoint(0, 0.5);
          title.setPosition(-W + 20, H - 30, 0);
          this.hud.getChildByName('Hint').setPosition(0, -H + 22, 0);
          this.dialog.setPosition(0, -H + 130, 0);
          this.toast.node.setPosition(0, H - 90, 0);
        } // -----------------------------------------------------------------------
        // Vòng lặp
        // -----------------------------------------------------------------------


        update(dt) {
          if (!this.ready) return;
          this.layoutHud();
          this.updateMovement(dt);
          this.updateFishing(dt);
          this.minigame.update(dt);
          this.updateDim(dt);
          this.player.update(dt);
          this.sortEntities();
          this.updateActionButton();
          this.updateCamera();
          this.updateHudTimers(dt);
        }

        busy() {
          return this.dialog.active || this.result.active || this.minigame.active;
        }
        /** Các bước câu cá mà nhân vật không được tự đi (đang móc / thu dây / xem cá). */


        fishLocked() {
          return this.fish === 'hooking' || this.fish === 'reel' || this.fish === 'reveal';
        }

        updateMovement(dt) {
          if (this.busy() || this.fishLocked()) {
            this.player.walk(0, 0, dt);
            return;
          }

          let dx = 0,
              dy = 0;
          const k = this.keys;
          if (k.has(KeyCode.KEY_A) || k.has(KeyCode.ARROW_LEFT)) dx -= 1;
          if (k.has(KeyCode.KEY_D) || k.has(KeyCode.ARROW_RIGHT)) dx += 1;
          if (k.has(KeyCode.KEY_W) || k.has(KeyCode.ARROW_UP)) dy -= 1;
          if (k.has(KeyCode.KEY_S) || k.has(KeyCode.ARROW_DOWN)) dy += 1;
          if (dx || dy) this.moveTarget = null;else if (this.moveTarget) {
            const tx = this.moveTarget.x - this.player.x,
                  ty = this.moveTarget.y - this.player.y;
            const d = Math.hypot(tx, ty);
            if (d < 3) this.moveTarget = null;else {
              dx = tx / d;
              dy = ty / d;
            }
          }

          if (dx || dy) {
            if (this.fish !== 'idle') {
              this.stopFishing('Đã thu cần.');
              this.moveTarget = null;
            }

            const len = Math.hypot(dx, dy);
            const ox = this.player.x,
                  oy = this.player.y;
            this.player.walk(dx / len, dy / len, dt);

            if (this.moveTarget) {
              const moved = Math.hypot(this.player.x - ox, this.player.y - oy);
              this.stuckT = moved < 0.2 ? this.stuckT + dt : 0;

              if (this.stuckT > 0.25) {
                this.moveTarget = null;
                this.stuckT = 0;
              }
            }
          } else {
            this.player.walk(0, 0, dt);
          }
        }

        sortEntities() {
          const list = this.sortables;
          list.sort((a, b) => a.sortY() - b.sortY());

          for (let i = 0; i < list.length; i++) if (list[i].node.getSiblingIndex() !== i) list[i].node.setSiblingIndex(i);
        }

        updateCamera() {
          const vs = view.getVisibleSize();
          const z = this.zoom;
          const halfW = vs.width / 2 / z,
                halfH = vs.height / 2 / z;
          const b = this.bounds;

          const clamp = (v, lo, hi) => lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v));

          const cx = clamp(this.player.x, b.x + halfW, b.x + b.w - halfW);
          const cy = clamp(this.player.y - 16, b.y + halfH, b.y + b.h - halfH);
          this.world.setPosition(Math.round(-cx * z), Math.round(cy * z), 0);
        } // -----------------------------------------------------------------------
        // Nút hành động (câu / nói chuyện / dịch chuyển) phía trên đầu
        // -----------------------------------------------------------------------


        nearestFishingZone() {
          let best = null,
              bd = (_crd && GAME === void 0 ? (_reportPossibleCrUseOfGAME({
            error: Error()
          }), GAME) : GAME).fishingRange;

          for (const z of this.room.fishing) {
            const d = (_crd && distToRect === void 0 ? (_reportPossibleCrUseOfdistToRect({
              error: Error()
            }), distToRect) : distToRect)(this.player.x, this.player.y, z);

            if (d <= bd) {
              bd = d;
              best = z;
            }
          }

          return best;
        }

        nearestNpc() {
          let best = null,
              bd = (_crd && GAME === void 0 ? (_reportPossibleCrUseOfGAME({
            error: Error()
          }), GAME) : GAME).interactRange;

          for (const n of this.npcs) {
            const d = Math.hypot(n.x - this.player.x, n.y - this.player.y);

            if (d <= bd) {
              bd = d;
              best = n;
            }
          }

          return best;
        }

        nearestTeleport() {
          let best = null,
              bd = (_crd && GAME === void 0 ? (_reportPossibleCrUseOfGAME({
            error: Error()
          }), GAME) : GAME).interactRange * 0.6;

          for (const t of this.room.teleports) {
            const d = (_crd && distToRect === void 0 ? (_reportPossibleCrUseOfdistToRect({
              error: Error()
            }), distToRect) : distToRect)(this.player.x, this.player.y, t);

            if (d <= bd) {
              bd = d;
              best = t;
            }
          }

          return best;
        }

        updateActionButton() {
          let kind = null,
              target = null;

          if (!this.busy()) {
            if (this.fish === 'request') {
              kind = 'fish';
            } else if (this.fish === 'idle') {
              const npc = this.nearestNpc();
              const zone = npc ? null : this.nearestFishingZone();
              const tp = npc || zone ? null : this.nearestTeleport();

              if (npc) {
                kind = 'speak';
                target = npc;
              } else if (zone) {
                kind = 'fish';
                target = zone;
              } else if (tp) {
                kind = 'teleport';
                target = tp;
              }
            }
          }

          if (kind !== this.actionKind) {
            this.btnPressed = false;
          }

          this.actionKind = kind;
          this.actionTarget = target;
          const bn = this.actionBtn.node;
          bn.active = !!kind;
          const px = Math.round(this.player.x),
                py = Math.round(this.player.y);
          this.playerTag.setPosition(px, -(py - 52), 0);

          if (kind) {
            this.refreshButtonFrame();
            bn.setPosition(px, -(py - 58), 0);
          }

          this.alert.node.setPosition(px + 14, -(py - 50), 0);
        }

        refreshButtonFrame() {
          if (!this.actionKind) return;

          if (this.fish === 'request') {
            // Đồng hồ cát: đang chuẩn bị quăng, không bấm được.
            const w = (_crd && Sheets === void 0 ? (_reportPossibleCrUseOfSheets({
              error: Error()
            }), Sheets) : Sheets).get('ui-buttons').frame('waitIcon');
            if (w) this.actionBtn.spriteFrame = w;
            return;
          }

          const suffix = this.btnPressed ? 'Pressed' : this.btnHover ? 'Hover' : '';
          const f = (_crd && Sheets === void 0 ? (_reportPossibleCrUseOfSheets({
            error: Error()
          }), Sheets) : Sheets).get('ui-buttons').frame(`${this.actionKind}Button${suffix}`);
          if (f) this.actionBtn.spriteFrame = f;
        }

        doAction() {
          if (this.dialog.active) {
            this.advanceDialog();
            return;
          }

          if (this.result.active) {
            this.result.close();
            return;
          }

          switch (this.actionKind) {
            case 'fish':
              if (this.fish === 'idle') this.startFishing(this.actionTarget);
              break;

            case 'speak':
              this.openDialog(this.actionTarget.def);
              break;

            case 'teleport':
              {
                const t = this.actionTarget;
                this.showToast(`Cổng tới "${t.dest}": scene này chưa dựng`, 2.2);
                break;
              }
          }
        } // -----------------------------------------------------------------------
        // Câu cá
        // -----------------------------------------------------------------------


        startFishing(zone) {
          this.moveTarget = null;
          this.fishZone = zone;
          this.player.face(zone.dir);
          this.fish = 'request';
          this.fishT = (_crd && FISHING === void 0 ? (_reportPossibleCrUseOfFISHING({
            error: Error()
          }), FISHING) : FISHING).requestTime;
        }

        onCastDone() {
          if (this.fish !== 'cast') return;
          this.fish = 'wait';
          this.fishT = (_crd && FISHING === void 0 ? (_reportPossibleCrUseOfFISHING({
            error: Error()
          }), FISHING) : FISHING).waitMin + Math.random() * ((_crd && FISHING === void 0 ? (_reportPossibleCrUseOfFISHING({
            error: Error()
          }), FISHING) : FISHING).waitMax - (_crd && FISHING === void 0 ? (_reportPossibleCrUseOfFISHING({
            error: Error()
          }), FISHING) : FISHING).waitMin);
          this.player.setMode('wait');
        }
        /** Người chơi bấm/chạm bất kỳ đâu (hoặc F / Space) trong lúc đang câu. Trả về true nếu đã xử lý. */


        fishingClick() {
          switch (this.fish) {
            case 'wait':
              this.failFishing('early');
              return true;

            case 'bite':
              this.alert.node.active = false;
              this.fish = 'hooking';
              this.fishT = (_crd && FISHING === void 0 ? (_reportPossibleCrUseOfFISHING({
                error: Error()
              }), FISHING) : FISHING).hookTime;
              this.player.setMode('reel');
              this.setDim(true);
              return true;

            case 'request':
            case 'cast':
            case 'hooking':
            case 'reel':
            case 'reveal':
              return true;
            // nuốt lần bấm, không làm gì
          }

          return false;
        }

        updateFishing(dt) {
          if (this.fish === 'idle' || this.fish === 'cast' || this.fish === 'reel') return;
          this.fishT -= dt;
          if (this.fishT > 0) return;

          switch (this.fish) {
            case 'request':
              this.fish = 'cast';
              if (this.fishZone) this.player.face(this.fishZone.dir);
              this.player.setMode('cast');
              break;

            case 'wait':
              {
                this.fish = 'bite';
                this.fishT = (_crd && FISHING === void 0 ? (_reportPossibleCrUseOfFISHING({
                  error: Error()
                }), FISHING) : FISHING).biteWindow;
                this.player.setMode('hooked');
                const seq = (_crd && Sheets === void 0 ? (_reportPossibleCrUseOfSheets({
                  error: Error()
                }), Sheets) : Sheets).get('fishing-hooked-alert').sequence('fishingHookedAlert');
                this.alert.node.active = true;
                this.alert.getComponent(_crd && FrameAnim === void 0 ? (_reportPossibleCrUseOfFrameAnim({
                  error: Error()
                }), FrameAnim) : FrameAnim).play(seq, 18, false);
                break;
              }

            case 'bite':
              this.failFishing('miss');
              break;

            case 'hooking':
              this.fish = 'reel';
              this.minigame.open(r => this.onReelDone(r));
              break;

            case 'reveal':
              this.finishReveal();
              break;
          }
        }

        onReelDone(r) {
          this.setDim(false);
          if (r === 'win') this.startReveal();else this.failFishing('reelFail');
        }

        failFishing(kind) {
          this.resetFishing();
          const t = (_crd && FISHING_TEXT === void 0 ? (_reportPossibleCrUseOfFISHING_TEXT({
            error: Error()
          }), FISHING_TEXT) : FISHING_TEXT)[kind];
          this.result.show(t.title, t.body, t.button, null);
        }

        resetFishing() {
          this.fish = 'idle';
          this.fishT = 0;
          this.alert.node.active = false;
          this.reveal.active = false;
          this.setDim(false);
          this.player.setMode('walk');
        }

        stopFishing(msg) {
          if (this.minigame.active || this.fishLocked()) return;
          this.resetFishing();
          if (msg) this.showToast(msg, 1.6);
        }

        rollCatch() {
          const total = (_crd && CATCH_TABLE === void 0 ? (_reportPossibleCrUseOfCATCH_TABLE({
            error: Error()
          }), CATCH_TABLE) : CATCH_TABLE).reduce((s, c) => s + c.weight, 0);
          let r = Math.random() * total;
          return (_crd && CATCH_TABLE === void 0 ? (_reportPossibleCrUseOfCATCH_TABLE({
            error: Error()
          }), CATCH_TABLE) : CATCH_TABLE).find(x => (r -= x.weight) < 0) || (_crd && CATCH_TABLE === void 0 ? (_reportPossibleCrUseOfCATCH_TABLE({
            error: Error()
          }), CATCH_TABLE) : CATCH_TABLE)[0];
        }
        /** Thẻ bay lên từ nước, treo trên lưỡi câu, bọt nước nổ, rồi hiện con cá. */


        startReveal() {
          const c = this.catchInfo = this.rollCatch();
          this.fish = 'reveal';
          this.fishT = 99; // finishReveal được gọi khi chuỗi hoạt ảnh xong

          this.player.setMode('walk');
          const caught = (_crd && Sheets === void 0 ? (_reportPossibleCrUseOfSheets({
            error: Error()
          }), Sheets) : Sheets).get('fishing-caught');
          const px = Math.round(this.player.x),
                py = Math.round(this.player.y);
          this.reveal.setPosition(px + 11.5, -(py - 56), 0);
          this.reveal.active = true;
          this.revealIcon.spriteFrame = null;
          this.revealIcon.node.active = false;
          this.revealSplash.node.active = false;
          const base = caught.sequence(c.rare ? 'fishing-caught-base-gold-' : 'fishing-caught-base-');
          this.revealCard.getComponent(_crd && FrameAnim === void 0 ? (_reportPossibleCrUseOfFrameAnim({
            error: Error()
          }), FrameAnim) : FrameAnim).play(base, 12, false, () => {
            this.revealSplash.node.active = true;
            this.revealSplash.getComponent(_crd && FrameAnim === void 0 ? (_reportPossibleCrUseOfFrameAnim({
              error: Error()
            }), FrameAnim) : FrameAnim).play(caught.sequence('fishing-caught-splash-'), 14, false, () => {
              this.revealSplash.node.active = false;
              this.revealIcon.spriteFrame = caught.frame(c.id);
              this.revealIcon.node.active = true;
              this.fishT = (_crd && FISHING === void 0 ? (_reportPossibleCrUseOfFISHING({
                error: Error()
              }), FISHING) : FISHING).revealTime;
            });
          });
        }

        finishReveal() {
          const c = this.catchInfo;
          this.resetFishing();
          if (!c) return;
          this.bag.set(c.name, (this.bag.get(c.name) || 0) + 1);
          let count = 0;
          this.bag.forEach(v => {
            count += v;
          });
          this.bagLabel.string = String(count);
          const t = (_crd && FISHING_TEXT === void 0 ? (_reportPossibleCrUseOfFISHING_TEXT({
            error: Error()
          }), FISHING_TEXT) : FISHING_TEXT).success;
          const name = c.rare ? `${c.name} (cá hiếm!)` : c.name;
          this.result.show(t.title, t.body.replace('{name}', name), t.button, (_crd && Sheets === void 0 ? (_reportPossibleCrUseOfSheets({
            error: Error()
          }), Sheets) : Sheets).get('fishing-caught').frame(c.id));
          this.catchInfo = null;
        }

        setDim(on) {
          this.dimTarget = on ? 255 : 0;
          if (on) this.dim.active = true;
        }

        updateDim(dt) {
          if (!this.dim.active) return;
          const o = this.dimOpacity.opacity;
          const step = 255 * dt / 0.25;
          const next = o < this.dimTarget ? Math.min(this.dimTarget, o + step) : Math.max(this.dimTarget, o - step);
          this.dimOpacity.opacity = next;
          if (next <= 0 && this.dimTarget === 0) this.dim.active = false;
        } // -----------------------------------------------------------------------
        // Hội thoại, bảng thông tin, toast
        // -----------------------------------------------------------------------


        openDialog(def) {
          this.moveTarget = null;
          const dx = def.x - this.player.x,
                dy = def.y - this.player.y;
          this.player.face(Math.abs(dx) > Math.abs(dy) ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'up' : 'down');
          this.dialogLines = def.lines;
          this.dialogIdx = 0;
          this.dialogName.string = def.name;
          const p = def.portrait ? (_crd && Sheets === void 0 ? (_reportPossibleCrUseOfSheets({
            error: Error()
          }), Sheets) : Sheets).tryGet(def.portrait) : undefined;
          this.dialogPortrait.spriteFrame = p ? p.first() : (_crd && Sheets === void 0 ? (_reportPossibleCrUseOfSheets({
            error: Error()
          }), Sheets) : Sheets).get(def.sheet).first();
          this.dialogText.string = this.dialogLines[0];
          this.dialog.active = true;
        }

        advanceDialog() {
          this.dialogIdx++;

          if (this.dialogIdx >= this.dialogLines.length) {
            this.dialog.active = false;
            return;
          }

          this.dialogText.string = this.dialogLines[this.dialogIdx];
        }

        toggleInfo(kind) {
          if (this.infoPanel.active && this.infoPanel.name === kind) {
            this.infoPanel.active = false;
            return;
          }

          this.infoPanel.name = kind;
          let text = '';

          if (kind === 'bag') {
            text = 'TÚI ĐỒ\n\n';
            if (!this.bag.size) text += 'Chưa có gì. Ra bến câu thử đi!';
            this.bag.forEach((n, name) => {
              text += `${name}  x${n}\n`;
            });
          } else if (kind === 'quests') {
            text = 'NHIỆM VỤ\n\nNói chuyện với Marlin ở chòi trên bến.';
          } else {
            text = 'HƯỚNG DẪN\n\nĐi: WASD / mũi tên, hoặc chạm vào chỗ muốn tới.\n' + 'Câu cá: đứng sát mép bến, bấm nút câu hoặc F / Space.\n' + 'Đừng bấm khi cá chưa cắn. Hiện dấu ! thì bấm ngay để móc cá.\n' + 'Minigame: bấm REEL (hoặc Space) khi cá nằm trong vùng xanh, đủ 3 lần. Trượt 1 lần là thua.\nNói chuyện: lại gần NPC, bấm E.\nB: bật/tắt lớp debug.';
          }

          this.infoLabel.string = text;
          this.infoPanel.active = true;
        }

        showToast(msg, secs) {
          this.toast.string = msg;
          this.toast.node.active = true;
          this.toastT = secs;
        }

        updateHudTimers(dt) {
          if (this.toastT > 0) {
            this.toastT -= dt;
            if (this.toastT <= 0) this.toast.node.active = false;
          }
        }

        drawDebug() {
          const g = this.debugGfx;
          if (!g) return;
          g.clear();
          if (!this.showDebug) return;
          const r = this.room;
          g.fillColor = new Color(255, 0, 0, 90);

          for (let i = 0; i < r.blocked.length; i++) {
            if (r.blocked.charCodeAt(i) !== 49) continue;
            const tx = i % r.cols,
                  ty = Math.floor(i / r.cols);
            g.rect(tx * r.tileW, -(ty + 1) * r.tileH, r.tileW, r.tileH);
          }

          g.fill();

          const box = (rc, c) => {
            g.fillColor = c;
            g.rect(rc.x, -(rc.y + Math.max(rc.h, 2)), Math.max(rc.w, 2), Math.max(rc.h, 2));
            g.fill();
          };

          r.fishing.forEach(z => box(z, new Color(0, 255, 255, 200)));
          r.teleports.forEach(t => box(t, new Color(255, 0, 255, 200)));
          r.colliders.forEach(c => box(c, new Color(255, 160, 0, 160)));
        } // -----------------------------------------------------------------------
        // Input
        // -----------------------------------------------------------------------


        onKeyDown(e) {
          this.keys.add(e.keyCode);
          if (!this.ready) return;

          switch (e.keyCode) {
            case KeyCode.KEY_F:
            case KeyCode.SPACE:
              if (this.dialog.active) this.advanceDialog();else if (this.result.active) this.result.close();else if (this.minigame.active) this.minigame.reel();else if (this.fishingClick()) {
                /* đã xử lý */
              } else if (this.actionKind === 'fish') this.doAction();
              break;

            case KeyCode.KEY_E:
            case KeyCode.ENTER:
              if (this.dialog.active) this.advanceDialog();else if (this.result.active) this.result.close();else if (this.minigame.active) this.minigame.reel();else if (this.actionKind) this.doAction();
              break;

            case KeyCode.ESCAPE:
              this.dialog.active = false;
              this.infoPanel.active = false;
              this.result.close();
              break;

            case KeyCode.KEY_B:
              this.showDebug = !this.showDebug;
              this.drawDebug();
              break;
          }
        }

        onKeyUp(e) {
          this.keys.delete(e.keyCode);
        }

        onTouch(e) {
          if (!this.ready || Date.now() - this.lastUiTouch < 80) return;

          if (this.dialog.active) {
            this.advanceDialog();
            return;
          }

          if (this.result.active || this.minigame.active) return;

          if (this.infoPanel.active) {
            this.infoPanel.active = false;
            return;
          } // Đang câu: chạm bất kỳ đâu = kéo cần (chờ → kéo sớm, dấu ! → móc cá).


          if (this.fishingClick()) return;
          const ui = e.getUILocation();
          const local = this.node.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(ui.x, ui.y, 0));
          const wp = this.world.position;
          this.moveTarget = {
            x: (local.x - wp.x) / this.zoom,
            y: -(local.y - wp.y) / this.zoom
          };
          this.stuckT = 0;
        }

      }, (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "roomName", [_dec2], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return 'coralCove';
        }
      }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, "zoom", [_dec3], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return (_crd && GAME === void 0 ? (_reportPossibleCrUseOfGAME({
            error: Error()
          }), GAME) : GAME).zoom;
        }
      }), _descriptor3 = _applyDecoratedDescriptor(_class2.prototype, "showDebug", [_dec4], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return false;
        }
      })), _class2)) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=8ef5011bb5370f50fd9e33c6f9b4a35bb665dd89.js.map