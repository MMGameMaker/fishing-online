System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, Node, director, Director, Canvas, UITransform, Sprite, Graphics, Color, Layers, Label, input, Input, KeyCode, builtinResMgr, math, _dec, _class, _crd, ccclass, UI_LAYER, TILE, COLS, ROWS, MAP_W, MAP_H, VIEW_W, VIEW_H, PlayerController;

  /**
   * Lay sprite frame trang mac dinh cua Cocos (asset built-in, khong can import file).
   * Thu vai key pho bien; neu khong co se tra ve null va chuyen sang ve bang Graphics.
   */
  function getBuiltinSpriteFrame() {
    const keys = ['default_sprite', 'default_sprite_splash', 'white_sprite'];

    for (const k of keys) {
      try {
        const sf = builtinResMgr.get(k);

        if (sf) {
          return sf;
        }
      } catch (e) {// bo qua, thu key tiep theo
      }
    }

    return null;
  }
  /** Tao mot hinh chu nhat co mau. Uu tien Sprite built-in, fallback sang Graphics. */


  function makeBox(name, w, h, color, parent) {
    const n = new Node(name);
    n.layer = UI_LAYER;
    const ut = n.addComponent(UITransform);
    ut.setContentSize(w, h);
    ut.setAnchorPoint(0.5, 0.5);
    const sf = getBuiltinSpriteFrame();

    if (sf) {
      const sp = n.addComponent(Sprite);
      sp.spriteFrame = sf;
      sp.sizeMode = Sprite.SizeMode.CUSTOM;
      sp.type = Sprite.Type.SIMPLE;
      sp.color = color;
    } else {
      const g = n.addComponent(Graphics);
      g.fillColor = color;
      g.rect(-w / 2, -h / 2, w, h);
      g.fill();
    }

    parent.addChild(n);
    return n;
  }
  /** Dieu khien nhan vat: WASD / phim mui ten, co camera follow va gioi han bien map. */


  /** Dung toan bo noi dung map + nhan vat vao trong Canvas cua scene dang chay. */
  function buildScene() {
    const scene = director.getScene();

    if (!scene) {
      return;
    }

    const canvas = scene.getComponentInChildren(Canvas);

    if (!canvas) {
      console.warn('[GameBootstrap] Khong tim thay Canvas trong scene.');
      return;
    }

    const canvasNode = canvas.node; // Tranh dung lai khi scene reload / hot update.

    if (canvasNode.getChildByName('World')) {
      return;
    } // World container cho camera follow.


    const world = new Node('World');
    world.layer = UI_LAYER;
    world.addComponent(UITransform);
    canvasNode.addChild(world); // Map: luoi tile kieu ban co hai sac xanh.

    const mapRoot = new Node('Map');
    mapRoot.layer = UI_LAYER;
    mapRoot.addComponent(UITransform);
    world.addChild(mapRoot);
    const green1 = new Color(96, 168, 96, 255);
    const green2 = new Color(74, 140, 80, 255);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const even = (r + c) % 2 === 0;
        const t = makeBox(`tile_${r}_${c}`, TILE, TILE, even ? green1 : green2, mapRoot);
        const x = -MAP_W / 2 + TILE / 2 + c * TILE;
        const y = -MAP_H / 2 + TILE / 2 + r * TILE;
        t.setPosition(x, y, 0);
      }
    } // Vai vat can de thay chuyen dong ro hon.


    const rockColor = new Color(120, 112, 100, 255);
    const obstacles = [[-400, 220, 220, 160], [460, -140, 180, 180], [60, 380, 320, 120], [-520, -260, 160, 240]];

    for (const [ox, oy, ow, oh] of obstacles) {
      const o = makeBox('rock', ow, oh, rockColor, mapRoot);
      o.setPosition(ox, oy, 0);
    } // Nhan vat.


    const player = makeBox('Player', 60, 60, new Color(228, 72, 72, 255), world);
    player.setPosition(0, 0, 0);
    const eye = makeBox('eye', 16, 16, new Color(255, 255, 255, 255), player);
    eye.setPosition(16, 10, 0);
    const pc = player.addComponent(PlayerController);
    pc.world = world; // HUD huong dan (dung system font, khong can asset).

    const hud = new Node('HUD');
    hud.layer = UI_LAYER;
    hud.addComponent(UITransform);
    canvasNode.addChild(hud);
    const label = hud.addComponent(Label);
    label.useSystemFont = true;
    label.string = 'Di chuyen: WASD hoac phim mui ten';
    label.fontSize = 24;
    label.lineHeight = 30;
    label.color = new Color(255, 255, 255, 255);
    hud.setPosition(0, VIEW_H / 2 - 40, 0);
    console.log('[GameBootstrap] San sang. Dung WASD / mui ten de di chuyen.');
  } // Tu chay khi scene khoi dong, khong can gan component trong editor.


  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      _decorator = _cc._decorator;
      Component = _cc.Component;
      Node = _cc.Node;
      director = _cc.director;
      Director = _cc.Director;
      Canvas = _cc.Canvas;
      UITransform = _cc.UITransform;
      Sprite = _cc.Sprite;
      Graphics = _cc.Graphics;
      Color = _cc.Color;
      Layers = _cc.Layers;
      Label = _cc.Label;
      input = _cc.input;
      Input = _cc.Input;
      KeyCode = _cc.KeyCode;
      builtinResMgr = _cc.builtinResMgr;
      math = _cc.math;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "a1b2cPUu7tLu4u7AAAAAAAC", "GameBootstrap", undefined);

      __checkObsolete__(['_decorator', 'Component', 'Node', 'director', 'Director', 'Canvas', 'UITransform', 'Sprite', 'SpriteFrame', 'Graphics', 'Color', 'Size', 'Layers', 'Label', 'input', 'Input', 'KeyCode', 'EventKeyboard', 'builtinResMgr', 'math']);

      ({
        ccclass
      } = _decorator);
      UI_LAYER = Layers.Enum.UI_2D; // Thong so map / view. Design resolution dat 960x640 trong Project Settings.

      TILE = 100;
      COLS = 20;
      ROWS = 15;
      MAP_W = COLS * TILE;
      MAP_H = ROWS * TILE;
      VIEW_W = 960;
      VIEW_H = 640;

      _export("PlayerController", PlayerController = (_dec = ccclass('PlayerController'), _dec(_class = class PlayerController extends Component {
        constructor(...args) {
          super(...args);
          this.speed = 520;
          this.world = null;
          this.keys = new Set();
          this.runTime = 0;
        }

        onLoad() {
          input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
          input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        }

        onDestroy() {
          input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
          input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        }

        onKeyDown(e) {
          this.keys.add(e.keyCode);
        }

        onKeyUp(e) {
          this.keys.delete(e.keyCode);
        }

        update(dt) {
          let dx = 0;
          let dy = 0;
          if (this.keys.has(KeyCode.KEY_A) || this.keys.has(KeyCode.ARROW_LEFT)) dx -= 1;
          if (this.keys.has(KeyCode.KEY_D) || this.keys.has(KeyCode.ARROW_RIGHT)) dx += 1;
          if (this.keys.has(KeyCode.KEY_W) || this.keys.has(KeyCode.ARROW_UP)) dy += 1;
          if (this.keys.has(KeyCode.KEY_S) || this.keys.has(KeyCode.ARROW_DOWN)) dy -= 1;
          const moving = dx !== 0 || dy !== 0;
          const p = this.node.position;
          let nx = p.x;
          let ny = p.y;

          if (moving) {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len;
            dy /= len;
            nx = p.x + dx * this.speed * dt;
            ny = p.y + dy * this.speed * dt;
            const halfW = MAP_W / 2;
            const halfH = MAP_H / 2;
            nx = math.clamp(nx, -halfW + 30, halfW - 30);
            ny = math.clamp(ny, -halfH + 30, halfH - 30);
            this.node.setPosition(nx, ny, 0);
          } // Hieu ung "chay": nhun nhay nhe khi di chuyen, huong theo truc X.


          const facing = dx > 0 ? 1 : dx < 0 ? -1 : Math.sign(this.node.scale.x) || 1;

          if (moving) {
            this.runTime += dt;
            const pulse = 1 + Math.sin(this.runTime * 18) * 0.12;
            this.node.setScale(facing, pulse, 1);
          } else {
            this.runTime = 0;
            this.node.setScale(facing, 1, 1);
          } // Camera follow: dich chuyen World de nhan vat luon o giua, kep tai bien map.


          if (this.world) {
            const camLimitX = MAP_W / 2 - VIEW_W / 2;
            const camLimitY = MAP_H / 2 - VIEW_H / 2;
            const camX = math.clamp(nx, -camLimitX, camLimitX);
            const camY = math.clamp(ny, -camLimitY, camLimitY);
            this.world.setPosition(-camX, -camY, 0);
          }
        }

      }) || _class));

      director.on(Director.EVENT_AFTER_SCENE_LAUNCH, () => {
        try {
          buildScene();
        } catch (e) {
          console.error('[GameBootstrap] Loi khi dung scene:', e);
        }
      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=8e83438e5a57fd3b61a70d61f9a34bded8428b5f.js.map