System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, _crd, PLAYER_LOOK, PLAYER_NAME, GAME, PLAYER_FEET, HAND, ROD_GRIP, ROOM_NPCS, CATCH_TABLE, FISHING, FISHING_TEXT;

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "11049h7DxhIV6XxfpcWykjX", "GameConfig", undefined); // Mọi thông số dễ chỉnh nằm ở đây. Đơn vị là pixel của map (1 ô = 30px).

      /** Ngoại hình nhân vật: chọn kiểu theo số thứ tự trong sprite sheet, màu là màu nhuộm (hex). */


      _export("PLAYER_LOOK", PLAYER_LOOK = {
        skin: 1,
        hair: 1,
        top: 1,
        bottom: 1,
        hairColor: '#6b4026',
        topColor: '#e8574a',
        bottomColor: '#3b5bdb'
      });

      _export("PLAYER_NAME", PLAYER_NAME = 'Zen');

      _export("GAME", GAME = {
        zoom: 2,
        // phóng to pixel art (2 = mỗi pixel ảnh thành 2x2 pixel màn hình)
        walkSpeed: 115,
        // px/giây
        walkFps: 8,
        feetHalfW: 7,
        // hộp va chạm ở chân
        feetH: 5,
        interactRange: 42,
        // khoảng cách để hiện nút nói chuyện / dịch chuyển
        fishingRange: 20,
        // khoảng cách tới vùng câu để hiện nút câu
        rodLevel: 1 // 1..5, cấp cần câu trong fishing-rods

      });
      /**
       * Điểm "chân" trong frame nhân vật 48x55 (tính từ góc trên trái).
       * Toạ độ nhân vật trên map chính là điểm này.
       */


      _export("PLAYER_FEET", PLAYER_FEET = {
        x: 24,
        y: 46
      });
      /** Điểm tay cầm cần trong frame nhân vật, theo hướng. */


      _export("HAND", HAND = {
        down: [24, 31],
        left: [17, 32],
        right: [31, 32],
        up: [24, 30]
      });
      /**
       * Điểm cán cần trong từng loại frame của fishing-rods (tính từ góc trên trái frame cần).
       * Cần được đặt sao cho điểm này trùng với HAND. Chỉnh ở đây nếu cần lệch tay.
       */


      _export("ROD_GRIP", ROD_GRIP = {
        cast: {
          down: [17, 40],
          left: [49, 39],
          right: [41, 39],
          up: [22, 51]
        },
        bob: {
          down: [7, 0],
          left: [31, 6],
          right: [0, 6],
          up: [7, 15]
        },
        reel: {
          down: [12, 0],
          left: [34, 3],
          right: [1, 3],
          up: [9, 13]
        }
      });
      /** NPC đặt trong phòng. sheet = npc-<tên> trong assets/resources/sheets. */


      _export("ROOM_NPCS", ROOM_NPCS = {
        coralCove: [{
          id: 'marlin',
          name: 'Marlin',
          sheet: 'npc-marlin',
          portrait: 'portrait-marlin',
          x: 2115,
          y: 1542,
          fps: 6,
          quest: 'offer',
          lines: ['Chào mừng tới Coral Cove! Ta là Marlin, giữ cái chòi này đã lâu lắm rồi.', 'Đứng sát mép bến, quay mặt ra nước rồi bấm nút câu (hoặc phím F) để quăng cần.', 'Đừng kéo sớm! Khi dấu ! hiện thì bấm ngay, rồi bấm REEL lúc cá nằm trong vùng xanh đủ 3 lần. Trượt một lần là cá chạy mất đấy!']
        }]
      });
      /** Cá và rác có thể câu được (tên frame trong fishing-caught). weight càng lớn càng dễ gặp. */


      _export("CATCH_TABLE", CATCH_TABLE = [{
        id: 'plaintail',
        name: 'Plaintail',
        weight: 30
      }, {
        id: 'rustyfin',
        name: 'Rustyfin',
        weight: 26
      }, {
        id: 'speckle',
        name: 'Speckle',
        weight: 24
      }, {
        id: 'darter',
        name: 'Darter',
        weight: 20
      }, {
        id: 'rockback',
        name: 'Rockback',
        weight: 16
      }, {
        id: 'squiggles',
        name: 'Squiggles',
        weight: 14
      }, {
        id: 'jellykins',
        name: 'Jellykins',
        weight: 12
      }, {
        id: 'thornish',
        name: 'Thornish',
        weight: 10
      }, {
        id: 'buttercod',
        name: 'Buttercod',
        weight: 10
      }, {
        id: 'lionfish',
        name: 'Lionfish',
        weight: 8
      }, {
        id: 'volcrab',
        name: 'Volcrab',
        weight: 8
      }, {
        id: 'clammy',
        name: 'Clammy',
        weight: 8
      }, {
        id: 'kittykarp',
        name: 'Kittykarp',
        weight: 6
      }, {
        id: 'cyhorse',
        name: 'Cyhorse',
        weight: 6
      }, {
        id: 'pirahound',
        name: 'Pirahound',
        weight: 5
      }, {
        id: 'hammerslice',
        name: 'Hammerslice',
        weight: 4
      }, {
        id: 'puckerlips',
        name: 'Puckerlips',
        weight: 4
      }, {
        id: 'barrakka',
        name: 'Barrakka',
        weight: 3
      }, {
        id: 'marlin',
        name: 'Marlin',
        weight: 2,
        rare: true
      }, {
        id: 'kraken',
        name: 'Kraken',
        weight: 1,
        rare: true
      }, {
        id: 'nessie',
        name: 'Nessie',
        weight: 1,
        rare: true
      }, {
        id: 'tire',
        name: 'Lốp xe cũ',
        weight: 6,
        junk: true
      }, {
        id: 'boot',
        name: 'Chiếc ủng',
        weight: 6,
        junk: true
      }, {
        id: 'can',
        name: 'Lon rỗng',
        weight: 5,
        junk: true
      }, {
        id: 'seaweed',
        name: 'Rong biển',
        weight: 6,
        junk: true
      }, {
        id: 'bottle',
        name: 'Cái chai',
        weight: 4,
        junk: true
      }]);

      _export("FISHING", FISHING = {
        castFps: 22,
        // tốc độ khung hình quăng cần (16 frame, khoảng 0.7-1.1 giây)
        requestTime: 1.0,
        // giây hiện đồng hồ cát trên đầu trước khi quăng (chỗ sau này chờ server)
        waitMin: 7.0,
        // giây chờ cá cắn, ngẫu nhiên trong [waitMin, waitMax]
        waitMax: 15.0,
        //   bấm trong lúc chờ = "kéo sớm", thua
        biteWindow: 1.5,
        // giây để bấm (bất kỳ đâu) khi dấu ! hiện
        hookTime: 1.5,
        // giây màn hình tối lại trước khi bảng minigame hiện
        reelTime: 10.0,
        // giây tổng của minigame REEL
        hitsNeeded: 3,
        // số lần trúng vùng xanh để câu được
        cursorSweep: 1.0,
        // giây con trỏ chạy từ mép này sang mép kia
        zoneLevel: 1,
        // 1..5: độ rộng vùng xanh (1 rộng nhất = 66px, 5 hẹp nhất = 26px trên thanh 278px)
        zoneMoveDelay: 0.25,
        // giây sau khi trúng thì vùng xanh nhảy chỗ khác
        winDelay: 1.2,
        // giây xem pháo giấy trước khi đóng bảng
        failDelay: 0.6,
        // giây hiện dấu X / hết giờ trước khi đóng bảng
        revealTime: 1.5 // giây treo thẻ cá trên đầu trước khi hiện popup SUCCESS

      });
      /** Nội dung popup kết quả câu cá. */


      _export("FISHING_TEXT", FISHING_TEXT = {
        miss: {
          title: 'TRƯỢT RỒI!',
          body: 'Cá chạy mất rồi, bạn không móc kịp. Lần sau khi thấy dấu ! hiện lên thì bấm/chạm vào bất kỳ đâu trên màn hình để móc cá.',
          button: 'OK, mình hiểu rồi'
        },
        early: {
          title: 'ÔI!',
          body: 'Bạn kéo cần sớm quá! Quăng lại đi, và đợi cá cắn câu rồi mới kéo.',
          button: 'OK, mình hiểu rồi'
        },
        reelFail: {
          title: 'ÔI!',
          body: 'Bạn chưa kéo được cá lên! Phải bấm REEL đúng lúc cá nằm trong vùng xanh đủ 3 lần, chỉ cần trượt một lần là cá thoát.',
          button: 'OK, mình hiểu rồi'
        },
        success: {
          title: 'THÀNH CÔNG!',
          body: 'Bạn đã câu được {name}.',
          button: 'OK, tuyệt!'
        }
      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=3a015887eb0408264a17dfa31d2344ca6679287d.js.map