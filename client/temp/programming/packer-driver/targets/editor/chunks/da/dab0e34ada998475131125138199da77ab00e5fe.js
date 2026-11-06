System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, Sprite, SpriteFrame, _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _dec8, _dec9, _dec10, _dec11, _dec12, _class, _class2, _descriptor, _descriptor2, _descriptor3, _descriptor4, _descriptor5, _descriptor6, _descriptor7, _descriptor8, _descriptor9, _descriptor10, _descriptor11, _crd, ccclass, property, FaceDir, CharacterAnimator;

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
      Sprite = _cc.Sprite;
      SpriteFrame = _cc.SpriteFrame;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "f1a2bPEfIBNkY4CvxosPU5f", "CharacterAnimator", undefined);

      __checkObsolete__(['_decorator', 'Component', 'Sprite', 'SpriteFrame']);

      ({
        ccclass,
        property
      } = _decorator);
      /** Bon huong cua bo sprite, dung thu tu hang trong sheet goc. */

      _export("FaceDir", FaceDir = /*#__PURE__*/function (FaceDir) {
        FaceDir[FaceDir["Down"] = 0] = "Down";
        FaceDir[FaceDir["Left"] = 1] = "Left";
        FaceDir[FaceDir["Right"] = 2] = "Right";
        FaceDir[FaceDir["Up"] = 3] = "Up";
        return FaceDir;
      }({}));
      /**
       * Doi frame cho nhan vat theo trang thai dung yen hoac di chuyen, va theo huong.
       *
       * Khong dung AnimationClip de khoi phai sinh file .anim; component tu dem thoi
       * gian va gan spriteFrame. Cac mang frame duoc noi san trong Main.scene va sua
       * duoc trong Inspector.
       */


      _export("CharacterAnimator", CharacterAnimator = (_dec = ccclass('CharacterAnimator'), _dec2 = property({
        type: Sprite,
        tooltip: 'Sprite hien thi nhan vat; de trong thi lay tren cung node'
      }), _dec3 = property({
        type: [SpriteFrame],
        tooltip: 'Dung yen, quay xuong'
      }), _dec4 = property({
        type: [SpriteFrame],
        tooltip: 'Dung yen, quay trai'
      }), _dec5 = property({
        type: [SpriteFrame],
        tooltip: 'Dung yen, quay phai'
      }), _dec6 = property({
        type: [SpriteFrame],
        tooltip: 'Dung yen, quay len'
      }), _dec7 = property({
        type: [SpriteFrame],
        tooltip: 'Di chuyen, quay xuong'
      }), _dec8 = property({
        type: [SpriteFrame],
        tooltip: 'Di chuyen, quay trai'
      }), _dec9 = property({
        type: [SpriteFrame],
        tooltip: 'Di chuyen, quay phai'
      }), _dec10 = property({
        type: [SpriteFrame],
        tooltip: 'Di chuyen, quay len'
      }), _dec11 = property({
        tooltip: 'So frame moi giay khi dung yen'
      }), _dec12 = property({
        tooltip: 'So frame moi giay khi di chuyen'
      }), _dec(_class = (_class2 = class CharacterAnimator extends Component {
        constructor(...args) {
          super(...args);

          _initializerDefineProperty(this, "target", _descriptor, this);

          _initializerDefineProperty(this, "idleDown", _descriptor2, this);

          _initializerDefineProperty(this, "idleLeft", _descriptor3, this);

          _initializerDefineProperty(this, "idleRight", _descriptor4, this);

          _initializerDefineProperty(this, "idleUp", _descriptor5, this);

          _initializerDefineProperty(this, "walkDown", _descriptor6, this);

          _initializerDefineProperty(this, "walkLeft", _descriptor7, this);

          _initializerDefineProperty(this, "walkRight", _descriptor8, this);

          _initializerDefineProperty(this, "walkUp", _descriptor9, this);

          _initializerDefineProperty(this, "idleFps", _descriptor10, this);

          _initializerDefineProperty(this, "walkFps", _descriptor11, this);

          this.dir = FaceDir.Down;
          this.moving = false;
          this.timer = 0;
          this.frame = 0;
        }

        onLoad() {
          if (!this.target) {
            this.target = this.getComponent(Sprite);
          }

          this.apply();
        }
        /**
         * Cap nhat huong va trang thai tu input di chuyen.
         *
         * `dx`, `dy` la vector input tho, `moving` la co that su dich chuyen hay khong.
         *
         * Huong doi theo input chu khong theo `moving`, nen khi nguoi choi day vao bo
         * ho thi nhan vat van quay mat ra nuoc du dang dung yen. Dieu nay can cho game
         * cau ca, vi nguoi choi phai dung tren bo va huong ra ho.
         *
         * Huong lay theo truc co do lon lon hon, nen di cheo se chon truc troi hon.
         */


        setMovement(dx, dy, moving) {
          let changed = false;

          if (dx !== 0 || dy !== 0) {
            const next = Math.abs(dx) >= Math.abs(dy) ? dx >= 0 ? FaceDir.Right : FaceDir.Left : dy >= 0 ? FaceDir.Up : FaceDir.Down;

            if (next !== this.dir) {
              this.dir = next; // Doi huong giua chung thi ve lai tu frame dau cho goi gang.

              this.timer = 0;
              this.frame = 0;
              changed = true;
            }
          }

          if (moving !== this.moving) {
            this.moving = moving;
            this.timer = 0;
            this.frame = 0;
            changed = true;
          } // Ap dung ngay thay vi doi nhip dem frame ke tiep, neu khong viec quay
          // huong se tre toi mot phan muoi giay va trong nhu bi khuc.


          if (changed) this.apply();
        }

        update(dt) {
          const frames = this.currentFrames();
          if (frames.length <= 1) return;
          const fps = this.moving ? this.walkFps : this.idleFps;
          if (fps <= 0) return;
          this.timer += dt;
          const step = 1 / fps;

          while (this.timer >= step) {
            this.timer -= step;
            this.frame = (this.frame + 1) % frames.length;
            this.apply();
          }
        }

        currentFrames() {
          if (this.moving) {
            switch (this.dir) {
              case FaceDir.Left:
                return this.walkLeft;

              case FaceDir.Right:
                return this.walkRight;

              case FaceDir.Up:
                return this.walkUp;

              default:
                return this.walkDown;
            }
          }

          switch (this.dir) {
            case FaceDir.Left:
              return this.idleLeft;

            case FaceDir.Right:
              return this.idleRight;

            case FaceDir.Up:
              return this.idleUp;

            default:
              return this.idleDown;
          }
        }

        apply() {
          if (!this.target) return;
          const frames = this.currentFrames();
          if (!frames.length) return;
          const sf = frames[this.frame % frames.length];
          if (sf) this.target.spriteFrame = sf;
        }

      }, (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "target", [_dec2], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, "idleDown", [_dec3], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return [];
        }
      }), _descriptor3 = _applyDecoratedDescriptor(_class2.prototype, "idleLeft", [_dec4], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return [];
        }
      }), _descriptor4 = _applyDecoratedDescriptor(_class2.prototype, "idleRight", [_dec5], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return [];
        }
      }), _descriptor5 = _applyDecoratedDescriptor(_class2.prototype, "idleUp", [_dec6], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return [];
        }
      }), _descriptor6 = _applyDecoratedDescriptor(_class2.prototype, "walkDown", [_dec7], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return [];
        }
      }), _descriptor7 = _applyDecoratedDescriptor(_class2.prototype, "walkLeft", [_dec8], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return [];
        }
      }), _descriptor8 = _applyDecoratedDescriptor(_class2.prototype, "walkRight", [_dec9], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return [];
        }
      }), _descriptor9 = _applyDecoratedDescriptor(_class2.prototype, "walkUp", [_dec10], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return [];
        }
      }), _descriptor10 = _applyDecoratedDescriptor(_class2.prototype, "idleFps", [_dec11], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return 4;
        }
      }), _descriptor11 = _applyDecoratedDescriptor(_class2.prototype, "walkFps", [_dec12], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return 10;
        }
      })), _class2)) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=dab0e34ada998475131125138199da77ab00e5fe.js.map