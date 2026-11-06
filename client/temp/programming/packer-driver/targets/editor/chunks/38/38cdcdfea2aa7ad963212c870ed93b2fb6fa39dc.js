System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, Signal, _crd;

  _export("Signal", void 0);

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "7ea41y89b1F/5UR5z9L69tA", "Signal", undefined);
      /**
       * Mot su kien co kieu ro rang.
       *
       * Dung mot Signal cho moi su kien thay vi mot event bus tra cuu bang chuoi,
       * vi nhu vay TypeScript kiem tra duoc kieu payload ngay luc bien dich, va doc
       * khai bao cua `IGameClient` la biet het su kien ma server co the gui ve.
       *
       * Khong import `cc` o day. Toan bo tang core, net, state, iso va fishing deu
       * khong phu thuoc engine, nho vay chay va kiem thu duoc bang Node thuan.
       */


      _export("Signal", Signal = class Signal {
        constructor() {
          this.handlers = [];
          this.onceHandlers = new Set();
        }

        /** Dang ky lang nghe. Tra ve ham huy dang ky. */
        on(handler) {
          this.handlers.push(handler);
          return () => this.off(handler);
        }
        /** Lang nghe dung mot lan roi tu huy. */


        once(handler) {
          this.onceHandlers.add(handler);
          return this.on(handler);
        }

        off(handler) {
          const i = this.handlers.indexOf(handler);
          if (i >= 0) this.handlers.splice(i, 1);
          this.onceHandlers.delete(handler);
        }

        clear() {
          this.handlers.length = 0;
          this.onceHandlers.clear();
        }

        get count() {
          return this.handlers.length;
        }
        /**
         * Goi tat ca handler.
         *
         * Duyet tren ban sao vi handler co the tu huy dang ky hoac dang ky them
         * ngay trong luc dang goi. Mot handler nem loi khong duoc lam chet cac
         * handler con lai, nen loi duoc bat va bao lai qua `onError`.
         */


        emit(payload) {
          const snapshot = this.handlers.slice();

          for (const handler of snapshot) {
            if (this.onceHandlers.has(handler)) {
              this.off(handler);
            }

            try {
              handler(payload);
            } catch (e) {
              Signal.onError(e, payload);
            }
          }
        }
        /** Cho phep tang tren thay the cach bao loi, mac dinh ghi ra console. */


      });

      Signal.onError = error => {
        console.error('[Signal] handler loi:', error);
      };

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=38cdcdfea2aa7ad963212c870ed93b2fb6fa39dc.js.map