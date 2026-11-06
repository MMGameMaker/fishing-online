System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, Node, UITransform, Vec2, Vec3, math, _dec, _dec2, _dec3, _dec4, _class, _class2, _descriptor, _descriptor2, _descriptor3, _crd, ccclass, property, VirtualJoystick;

  function _initializerDefineProperty(target, property, descriptor, context) { if (!descriptor) return; Object.defineProperty(target, property, { enumerable: descriptor.enumerable, configurable: descriptor.configurable, writable: descriptor.writable, value: descriptor.initializer ? descriptor.initializer.call(context) : void 0 }); }

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'transform-class-properties is enabled and runs after the decorators transform.'); }

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      _decorator = _cc._decorator;
      Component = _cc.Component;
      Node = _cc.Node;
      UITransform = _cc.UITransform;
      Vec2 = _cc.Vec2;
      Vec3 = _cc.Vec3;
      math = _cc.math;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "c1d2eP0anBLgZySrQ4fKjtM", "VirtualJoystick", undefined);

      __checkObsolete__(['_decorator', 'Component', 'Node', 'UITransform', 'EventTouch', 'Vec2', 'Vec3', 'math']);

      ({
        ccclass,
        property
      } = _decorator);
      /**
       * Joystick ao dieu khien bang chuot hoac cam ung.
       *
       * Gan tren node "Joystick" (nam trong Canvas nen khong di chuyen theo camera).
       * Keo trong vung joystick de dieu khien; nha ra thi nut tro ve giua va dung lai.
       * Doc ket qua qua thuoc tinh `direction`: huong da chuan hoa, do lon 0..1,
       * nen keo nhe thi di cham, keo het bien thi di toc do toi da.
       */

      _export("VirtualJoystick", VirtualJoystick = (_dec = ccclass('VirtualJoystick'), _dec2 = property({
        type: Node,
        tooltip: 'Nut tron o giua, di chuyen theo ngon tay'
      }), _dec3 = property({
        tooltip: 'Ban kinh toi da nut co the roi khoi tam (pixel)'
      }), _dec4 = property({
        tooltip: 'Vung chet o giua, duoi muc nay coi nhu khong di chuyen (0..1)'
      }), _dec(_class = (_class2 = class VirtualJoystick extends Component {
        constructor(...args) {
          super(...args);

          _initializerDefineProperty(this, "knob", _descriptor, this);

          _initializerDefineProperty(this, "radius", _descriptor2, this);

          _initializerDefineProperty(this, "deadZone", _descriptor3, this);

          this._direction = new Vec2(0, 0);
          this._pressed = false;
          this._uiTransform = null;
        }

        /** Huong dieu khien hien tai. Do lon 0 khi khong dung, toi da 1. */
        get direction() {
          return this._direction;
        }
        /** Dang co ngon tay / chuot tren joystick hay khong. */


        get pressed() {
          return this._pressed;
        }

        onLoad() {
          this._uiTransform = this.node.getComponent(UITransform);
          this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
          this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
          this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
          this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
          this.resetKnob();
        }

        onDestroy() {
          this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
          this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
          this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
          this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        }

        onTouchStart(e) {
          this._pressed = true;
          this.applyTouch(e);
        }

        onTouchMove(e) {
          if (!this._pressed) return;
          this.applyTouch(e);
        }

        onTouchEnd() {
          this._pressed = false;
          this.resetKnob();
        }
        /** Doi vi tri cham sang toa do cuc bo cua joystick, kep trong ban kinh. */


        applyTouch(e) {
          if (!this._uiTransform) return;
          const ui = e.getUILocation();

          const local = this._uiTransform.convertToNodeSpaceAR(new Vec3(ui.x, ui.y, 0));

          let x = local.x;
          let y = local.y;
          const dist = Math.sqrt(x * x + y * y);

          if (dist > this.radius && dist > 0) {
            const k = this.radius / dist;
            x *= k;
            y *= k;
          }

          if (this.knob) {
            this.knob.setPosition(x, y, 0);
          } // Do lon 0..1 theo ti le ban kinh, bo qua vung chet.


          const mag = math.clamp01(Math.sqrt(x * x + y * y) / this.radius);

          if (mag < this.deadZone) {
            this._direction.set(0, 0);

            return;
          }

          const len = Math.sqrt(x * x + y * y);

          this._direction.set(x / len * mag, y / len * mag);
        }

        resetKnob() {
          this._direction.set(0, 0);

          if (this.knob) {
            this.knob.setPosition(0, 0, 0);
          }
        }

      }, (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "knob", [_dec2], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, "radius", [_dec3], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return 60;
        }
      }), _descriptor3 = _applyDecoratedDescriptor(_class2.prototype, "deadZone", [_dec4], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return 0.15;
        }
      })), _class2)) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=04f26afd67caa27295d7321a394f0af0fd7fc530.js.map