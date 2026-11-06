System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, Node, input, Input, KeyCode, math, VirtualJoystick, CharacterAnimator, _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _dec8, _dec9, _dec10, _dec11, _dec12, _dec13, _dec14, _class, _class2, _descriptor, _descriptor2, _descriptor3, _descriptor4, _descriptor5, _descriptor6, _descriptor7, _descriptor8, _descriptor9, _descriptor10, _descriptor11, _descriptor12, _descriptor13, _crd, ccclass, property, PlayerController;

  function _initializerDefineProperty(target, property, descriptor, context) { if (!descriptor) return; Object.defineProperty(target, property, { enumerable: descriptor.enumerable, configurable: descriptor.configurable, writable: descriptor.writable, value: descriptor.initializer ? descriptor.initializer.call(context) : void 0 }); }

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'transform-class-properties is enabled and runs after the decorators transform.'); }

  function _reportPossibleCrUseOfVirtualJoystick(extras) {
    _reporterNs.report("VirtualJoystick", "./VirtualJoystick", _context.meta, extras);
  }

  function _reportPossibleCrUseOfCharacterAnimator(extras) {
    _reporterNs.report("CharacterAnimator", "./CharacterAnimator", _context.meta, extras);
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
      input = _cc.input;
      Input = _cc.Input;
      KeyCode = _cc.KeyCode;
      math = _cc.math;
    }, function (_unresolved_2) {
      VirtualJoystick = _unresolved_2.VirtualJoystick;
    }, function (_unresolved_3) {
      CharacterAnimator = _unresolved_3.CharacterAnimator;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "b1c2dPkX2BKcYuCnA0eLzpL", "PlayerController", undefined);

      __checkObsolete__(['_decorator', 'Component', 'Node', 'input', 'Input', 'KeyCode', 'EventKeyboard', 'math']);

      ({
        ccclass,
        property
      } = _decorator);
      /**
       * Dieu khien nhan vat di chuyen quanh map.
       *
       * Hai cach dieu khien dung dong thoi:
       *  - Ban phim: WASD hoac phim mui ten (luon di toc do toi da).
       *  - Joystick ao: keo bang chuot hoac cam ung (toc do ti le theo do nghieng).
       *
       * Gan san tren node "Player" trong Main.scene; thong so chinh trong Inspector.
       */

      _export("PlayerController", PlayerController = (_dec = ccclass('PlayerController'), _dec2 = property({
        tooltip: 'Toc do di chuyen toi da (pixel moi giay)'
      }), _dec3 = property({
        type: Node,
        tooltip: 'Node World duoc dich chuyen de camera bam theo nhan vat'
      }), _dec4 = property({
        type: _crd && VirtualJoystick === void 0 ? (_reportPossibleCrUseOfVirtualJoystick({
          error: Error()
        }), VirtualJoystick) : VirtualJoystick,
        tooltip: 'Joystick ao; de trong neu chi dung ban phim'
      }), _dec5 = property({
        type: _crd && CharacterAnimator === void 0 ? (_reportPossibleCrUseOfCharacterAnimator({
          error: Error()
        }), CharacterAnimator) : CharacterAnimator,
        tooltip: 'Hoat anh nhan vat; de trong thi lay tren cung node'
      }), _dec6 = property({
        tooltip: 'Chieu ngang map (pixel)'
      }), _dec7 = property({
        tooltip: 'Chieu doc map (pixel)'
      }), _dec8 = property({
        tooltip: 'Be day vien da quanh map, nhan vat khong di ra ngoai duoc'
      }), _dec9 = property({
        tooltip: 'Ban kinh ngang cua mat nuoc; de 0 neu map khong co ho'
      }), _dec10 = property({
        tooltip: 'Ban kinh doc cua mat nuoc'
      }), _dec11 = property({
        tooltip: 'Khoang dem giu nhan vat cach xa mep nuoc. 0 = sat nuoc, 48 = mot o tile. ' + 'Duoi 16 thi vai cho nhan vat van dam len mat nuoc, vi ho ve theo o vuong ' + 'con va cham tinh theo hinh elip tron.'
      }), _dec12 = property({
        tooltip: 'Chieu ngang khung nhin (design resolution)'
      }), _dec13 = property({
        tooltip: 'Chieu doc khung nhin (design resolution)'
      }), _dec14 = property({
        tooltip: 'Nua be rong nhan vat, dung de kep trong bien map'
      }), _dec(_class = (_class2 = class PlayerController extends Component {
        constructor() {
          super(...arguments);

          _initializerDefineProperty(this, "speed", _descriptor, this);

          _initializerDefineProperty(this, "world", _descriptor2, this);

          _initializerDefineProperty(this, "joystick", _descriptor3, this);

          _initializerDefineProperty(this, "animator", _descriptor4, this);

          _initializerDefineProperty(this, "mapWidth", _descriptor5, this);

          _initializerDefineProperty(this, "mapHeight", _descriptor6, this);

          _initializerDefineProperty(this, "edgePadding", _descriptor7, this);

          _initializerDefineProperty(this, "lakeRadiusX", _descriptor8, this);

          _initializerDefineProperty(this, "lakeRadiusY", _descriptor9, this);

          _initializerDefineProperty(this, "lakeMargin", _descriptor10, this);

          _initializerDefineProperty(this, "viewWidth", _descriptor11, this);

          _initializerDefineProperty(this, "viewHeight", _descriptor12, this);

          _initializerDefineProperty(this, "halfSize", _descriptor13, this);

          this.keys = new Set();
        }

        onLoad() {
          if (!this.animator) {
            this.animator = this.getComponent(_crd && CharacterAnimator === void 0 ? (_reportPossibleCrUseOfCharacterAnimator({
              error: Error()
            }), CharacterAnimator) : CharacterAnimator);
          }

          input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
          input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        }

        onDestroy() {
          input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
          input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        }

        start() {
          this.updateCamera(this.node.position.x, this.node.position.y);
          console.log('[PlayerController] San sang. Dung WASD / phim mui ten, hoac keo joystick goc duoi ben trai.');
        }

        onKeyDown(e) {
          this.keys.add(e.keyCode);
        }

        onKeyUp(e) {
          this.keys.delete(e.keyCode);
        }

        update(dt) {
          var dx = 0;
          var dy = 0; // --- Ban phim ---

          if (this.keys.has(KeyCode.KEY_A) || this.keys.has(KeyCode.ARROW_LEFT)) dx -= 1;
          if (this.keys.has(KeyCode.KEY_D) || this.keys.has(KeyCode.ARROW_RIGHT)) dx += 1;
          if (this.keys.has(KeyCode.KEY_W) || this.keys.has(KeyCode.ARROW_UP)) dy += 1;
          if (this.keys.has(KeyCode.KEY_S) || this.keys.has(KeyCode.ARROW_DOWN)) dy -= 1; // --- Joystick ao ---

          if (this.joystick) {
            var jd = this.joystick.direction;
            dx += jd.x;
            dy += jd.y;
          } // Do lon toi da 1; keo joystick nhe thi di cham hon.


          var mag = Math.sqrt(dx * dx + dy * dy);
          var moving = mag > 0.001; // Phai luu toa do dau khung hinh ra so rieng. `node.position` tra ve
          // chinh vector noi bo cua node, nen sau khi setPosition no da doi theo,
          // va moi phep so sanh voi no deu vo nghia.

          var startX = this.node.position.x;
          var startY = this.node.position.y;
          var nx = startX;
          var ny = startY;

          if (moving) {
            var ux = dx / mag;
            var uy = dy / mag;
            if (mag > 1) mag = 1;
            var limitX = Math.max(0, this.mapWidth / 2 - this.edgePadding - this.halfSize);
            var limitY = Math.max(0, this.mapHeight / 2 - this.edgePadding - this.halfSize);
            var step = this.speed * mag * dt; // Xet tung truc rieng de nhan vat truot doc bo ho thay vi dung khung lai.

            var tryX = math.clamp(startX + ux * step, -limitX, limitX);
            if (!this.inWater(tryX, ny)) nx = tryX;
            var tryY = math.clamp(startY + uy * step, -limitY, limitY);
            if (!this.inWater(nx, tryY)) ny = tryY;
            this.node.setPosition(nx, ny, 0);
          } // Chi coi la dang di khi thuc su nhuc nhich, de khi bi chan boi bo ho
          // thi nhan vat chuyen ve dung yen thay vi giam chan tai cho.


          var actuallyMoved = nx !== startX || ny !== startY;

          if (this.animator) {
            this.animator.setMovement(dx, dy, moving && actuallyMoved);
          }

          this.updateCamera(nx, ny);
        }
        /**
         * Vi tri nay co bi cam khong.
         *
         * Ban kinh mat nuoc duoc cong them nua be rong nhan vat va `lakeMargin`,
         * nen vung cam rong hon mat nuoc ve tren map. Can co dem vi ho duoc ve theo
         * o vuong 48 don vi con va cham lai tinh theo hinh elip tron, hai hinh nay
         * khong khop nhau; khong co dem thi vai cho nhan vat dam len mat nuoc.
         */


        inWater(x, y) {
          if (this.lakeRadiusX <= 0 || this.lakeRadiusY <= 0) return false;
          var rx = this.lakeRadiusX + this.halfSize + this.lakeMargin;
          var ry = this.lakeRadiusY + this.halfSize + this.lakeMargin;
          var dx = x / rx;
          var dy = y / ry;
          return dx * dx + dy * dy <= 1;
        }
        /** Dich World nguoc huong nhan vat de nhan vat o giua, kep lai tai bien map. */


        updateCamera(px, py) {
          if (!this.world) return;
          var limitX = Math.max(0, this.mapWidth / 2 - this.viewWidth / 2);
          var limitY = Math.max(0, this.mapHeight / 2 - this.viewHeight / 2);
          var camX = math.clamp(px, -limitX, limitX);
          var camY = math.clamp(py, -limitY, limitY);
          this.world.setPosition(-camX, -camY, 0);
        }

      }, (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "speed", [_dec2], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return 520;
        }
      }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, "world", [_dec3], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return null;
        }
      }), _descriptor3 = _applyDecoratedDescriptor(_class2.prototype, "joystick", [_dec4], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return null;
        }
      }), _descriptor4 = _applyDecoratedDescriptor(_class2.prototype, "animator", [_dec5], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return null;
        }
      }), _descriptor5 = _applyDecoratedDescriptor(_class2.prototype, "mapWidth", [_dec6], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return 1920;
        }
      }), _descriptor6 = _applyDecoratedDescriptor(_class2.prototype, "mapHeight", [_dec7], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return 1440;
        }
      }), _descriptor7 = _applyDecoratedDescriptor(_class2.prototype, "edgePadding", [_dec8], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return 48;
        }
      }), _descriptor8 = _applyDecoratedDescriptor(_class2.prototype, "lakeRadiusX", [_dec9], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return 624;
        }
      }), _descriptor9 = _applyDecoratedDescriptor(_class2.prototype, "lakeRadiusY", [_dec10], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return 384;
        }
      }), _descriptor10 = _applyDecoratedDescriptor(_class2.prototype, "lakeMargin", [_dec11], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return 48;
        }
      }), _descriptor11 = _applyDecoratedDescriptor(_class2.prototype, "viewWidth", [_dec12], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return 960;
        }
      }), _descriptor12 = _applyDecoratedDescriptor(_class2.prototype, "viewHeight", [_dec13], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return 640;
        }
      }), _descriptor13 = _applyDecoratedDescriptor(_class2.prototype, "halfSize", [_dec14], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return 30;
        }
      })), _class2)) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=b25a35db13d26590ee8a6cc11be45b876e9a50a8.js.map