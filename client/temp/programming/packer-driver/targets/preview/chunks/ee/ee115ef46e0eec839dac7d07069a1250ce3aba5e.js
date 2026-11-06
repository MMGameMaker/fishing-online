#!/usr/bin/env node
// Chuyển một map Tiled (.json) trong thư mục reference sang dữ liệu cho Cocos Creator 3.8.
//
//   node tools/build-room.mjs <thư-mục-reference> [room]
//   ví dụ (chạy trong thư mục client/): node tools/build-room.mjs assets/art-resource coralCove
//
// <thư-mục-reference> là thư mục chứa maps/, assets/, images/ (thư mục giải nén từ new-reference.rar).
// Kết quả ghi vào assets/resources/ của project này:
//   maps/<room>/<room>-below.tmx   các tile layer nằm dưới nhân vật (nước, đất, objects background)
//   maps/<room>/<room>-above.tmx   các tile layer nằm trên nhân vật (objects foreground, mây)
//   maps/<room>/*.png              ảnh tileset
//   rooms/<room>.json              decor, ô chặn, vùng câu cá, cổng dịch chuyển, điểm xuất hiện
//   sheets/<tên>.png + <tên>-frames.json   sprite sheet (decor, nhân vật, NPC, UI)
// Chạy lại an toàn: file cũ bị ghi đè.
System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, fs, path, fileURLToPath, _crd, HERE, PROJECT, OUT, REF, ROOM, MAPS, A, mkdirp, readJson, kebab, props, writtenSheets, mapPath, map, TW, TH, W, H, flat, byName, mapOut, esc, below, above, seenGroup, l, SHEET_DIRS, ALIAS, decor, missing, group, _l, _p$z, _l$opacity, p, imgPath, base, sheet, frames, animated, s, blockedLayer, blocked, code, rect, objs, teleports, spawn, f, layer, o, _p, bx0, by0, bx1, by1, _l2, bounds, room, SS, shared, n, png, json, _p2, j, kind, d, _f, _j, NPC_DIR, _f2, _j2, PORT, _f3, G, MENU, _f4;

  function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

  // tên sheet -> nguồn
  function writeSheet(name, pngPath, jsonPath) {
    if (writtenSheets.has(name)) return name;
    mkdirp((_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
      error: Error()
    }), path) : path).join(OUT, 'sheets'));
    (_crd && fs === void 0 ? (_reportPossibleCrUseOffs({
      error: Error()
    }), fs) : fs).copyFileSync(pngPath, (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
      error: Error()
    }), path) : path).join(OUT, 'sheets', name + '.png'));
    var frames = {};
    var order = [];

    if (jsonPath) {
      var d = readJson(jsonPath);
      var list = Array.isArray(d.frames) ? d.frames : Object.entries(d.frames).map(_ref => {
        var [filename, v] = _ref;
        return _extends({
          filename
        }, v);
      });

      for (var f of list) {
        frames[f.filename] = [f.frame.x, f.frame.y, f.frame.w, f.frame.h];
        order.push(f.filename);
      }
    } else {
      var {
        w,
        h
      } = pngSize(pngPath);
      frames['0'] = [0, 0, w, h];
      order.push('0');
    }

    (_crd && fs === void 0 ? (_reportPossibleCrUseOffs({
      error: Error()
    }), fs) : fs).writeFileSync((_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
      error: Error()
    }), path) : path).join(OUT, 'sheets', name + '-frames.json'), JSON.stringify({
      frames,
      order
    }));
    writtenSheets.set(name, pngPath);
    return name;
  }

  function pngSize(p) {
    var b = (_crd && fs === void 0 ? (_reportPossibleCrUseOffs({
      error: Error()
    }), fs) : fs).readFileSync(p);
    return {
      w: b.readUInt32BE(16),
      h: b.readUInt32BE(20)
    };
  } // ---------------------------------------------------------------------------
  // Map
  // ---------------------------------------------------------------------------


  function walk(layers, group) {
    if (group === void 0) {
      group = '';
    }

    return function* () {
      for (var l of layers) {
        if (l.type === 'group') yield* walk(l.layers, l.name);else yield {
          group,
          layer: l
        };
      }
    }();
  }

  function tilesetXml(ts) {
    var src = (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
      error: Error()
    }), path) : path).normalize((_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
      error: Error()
    }), path) : path).join(MAPS, ts.image));
    var img = (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
      error: Error()
    }), path) : path).basename(src);
    (_crd && fs === void 0 ? (_reportPossibleCrUseOffs({
      error: Error()
    }), fs) : fs).copyFileSync(src, (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
      error: Error()
    }), path) : path).join(mapOut, img));
    var x = "  <tileset firstgid=\"" + ts.firstgid + "\" name=\"" + esc(ts.name) + "\" tilewidth=\"" + ts.tilewidth + "\" tileheight=\"" + ts.tileheight + "\" tilecount=\"" + ts.tilecount + "\" columns=\"" + ts.columns + "\">\n";
    x += "    <image source=\"" + esc(img) + "\" width=\"" + ts.imagewidth + "\" height=\"" + ts.imageheight + "\"/>\n";

    for (var t of ts.tiles || []) {
      if (!t.animation) continue;
      x += "    <tile id=\"" + t.id + "\">\n      <animation>\n";

      for (var f of t.animation) x += "        <frame tileid=\"" + f.tileid + "\" duration=\"" + f.duration + "\"/>\n";

      x += "      </animation>\n    </tile>\n";
    }

    return x + '  </tileset>\n';
  }

  function layerXml(l, id) {
    var buf = Buffer.alloc(l.data.length * 4);
    l.data.forEach((g, i) => buf.writeUInt32LE(g >>> 0, i * 4));
    var op = l.opacity !== undefined && l.opacity !== 1 ? " opacity=\"" + l.opacity + "\"" : '';
    return "  <layer id=\"" + id + "\" name=\"" + esc(l.name) + "\" width=\"" + l.width + "\" height=\"" + l.height + "\"" + op + ">\n" + ("    <data encoding=\"base64\">" + buf.toString('base64') + "</data>\n  </layer>\n");
  }

  function writeTmx(file, layers) {
    var x = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
    x += "<map version=\"1.10\" tiledversion=\"1.11.2\" orientation=\"orthogonal\" renderorder=\"right-down\" width=\"" + W + "\" height=\"" + H + "\" tilewidth=\"" + TW + "\" tileheight=\"" + TH + "\" infinite=\"0\" nextlayerid=\"" + (layers.length + 1) + "\" nextobjectid=\"1\">\n";

    for (var ts of map.tilesets) x += tilesetXml(ts);

    layers.forEach((l, i) => {
      x += layerXml(l, i + 1);
    });
    x += "</map>\n";
    (_crd && fs === void 0 ? (_reportPossibleCrUseOffs({
      error: Error()
    }), fs) : fs).writeFileSync((_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
      error: Error()
    }), path) : path).join(mapOut, file), x);
  } // Tile layer nhìn thấy được: những layer đứng trước group objectsBelow nằm dưới nhân vật, còn lại nằm trên.


  function findSheet(layerName, imageBase) {
    var cands = [ALIAS[layerName], kebab(layerName), imageBase].filter(Boolean);

    for (var c of cands) for (var d of SHEET_DIRS) {
      var j = (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(d, c + '-spritesheet.json'),
          p = (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(d, c + '-spritesheet.png');
      if ((_crd && fs === void 0 ? (_reportPossibleCrUseOffs({
        error: Error()
      }), fs) : fs).existsSync(j) && (_crd && fs === void 0 ? (_reportPossibleCrUseOffs({
        error: Error()
      }), fs) : fs).existsSync(p)) return {
        name: c,
        json: j,
        png: p
      };
    }

    return null;
  }

  function _reportPossibleCrUseOffs(extras) {
    _reporterNs.report("fs", "node:fs", _context.meta, extras);
  }

  function _reportPossibleCrUseOfpath(extras) {
    _reporterNs.report("path", "node:path", _context.meta, extras);
  }

  function _reportPossibleCrUseOffileURLToPath(extras) {
    _reporterNs.report("fileURLToPath", "node:url", _context.meta, extras);
  }

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }, function (_unresolved_2) {
      fs = _unresolved_2.default;
    }, function (_unresolved_3) {
      path = _unresolved_3.default;
    }, function (_unresolved_4) {
      fileURLToPath = _unresolved_4.fileURLToPath;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "54abcLcWIJNVLHq39PEg3Vw", "build-room", undefined);

      HERE = (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).dirname((_crd && fileURLToPath === void 0 ? (_reportPossibleCrUseOffileURLToPath({
        error: Error()
      }), fileURLToPath) : fileURLToPath)(_context.meta.url));
      PROJECT = (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).resolve(HERE, '..');
      OUT = (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(PROJECT, 'assets', 'resources');
      REF = process.argv[2];
      ROOM = process.argv[3] || 'coralCove';

      if (!REF || !(_crd && fs === void 0 ? (_reportPossibleCrUseOffs({
        error: Error()
      }), fs) : fs).existsSync((_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(REF, 'maps'))) {
        console.error('Cách dùng: node tools/build-room.mjs <thư-mục-reference có maps/ và assets/> [room]');
        process.exit(1);
      }

      MAPS = (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(REF, 'maps');
      A = (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(REF, 'assets');

      mkdirp = d => (_crd && fs === void 0 ? (_reportPossibleCrUseOffs({
        error: Error()
      }), fs) : fs).mkdirSync(d, {
        recursive: true
      });

      readJson = p => JSON.parse((_crd && fs === void 0 ? (_reportPossibleCrUseOffs({
        error: Error()
      }), fs) : fs).readFileSync(p, 'utf8'));

      kebab = s => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase();

      props = o => Object.fromEntries((o.properties || []).map(p => [p.name, p.value])); // ---------------------------------------------------------------------------
      // Sprite sheet: chép PNG + viết JSON gọn { frames: { tên: [x,y,w,h] }, order: [...] }
      // ---------------------------------------------------------------------------


      writtenSheets = new Map();
      mapPath = (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(MAPS, ROOM + '.json');
      map = readJson(mapPath);
      TW = map.tilewidth;
      TH = map.tileheight;
      W = map.width;
      H = map.height;
      flat = [...walk(map.layers)];

      byName = n => {
        var _flat$find;

        return (_flat$find = flat.find(e => e.layer.name === n)) == null ? void 0 : _flat$find.layer;
      }; // --- TMX ---------------------------------------------------------------------


      mapOut = (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(OUT, 'maps', ROOM);
      mkdirp(mapOut);

      esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

      below = [];
      above = [];
      {
        seenGroup = false;

        for (l of map.layers) {
          if (l.type === 'group') {
            seenGroup = true;
            continue;
          }

          if (l.type !== 'tilelayer' || !l.visible) continue;
          if (!l.data.some(Boolean)) continue;
          (seenGroup ? above : below).push(l);
        }
      }
      writeTmx(ROOM + "-below.tmx", below);
      if (above.length) writeTmx(ROOM + "-above.tmx", above); // --- Decor (image layer) ---------------------------------------------------

      SHEET_DIRS = [(_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(A, 'rooms', ROOM, 'spritesheets'), (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(A, 'spritesheets'), ...(_crd && fs === void 0 ? (_reportPossibleCrUseOffs({
        error: Error()
      }), fs) : fs).readdirSync((_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(A, 'rooms')).map(r => (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(A, 'rooms', r, 'spritesheets'))];
      ALIAS = {
        safeAreaChristmasTree: 'safearea-christmas-tree',
        bzSign: 'bz-sign',
        apartmentFountain: 'apartment-fountain',
        nightclubFan: 'nightclub-fan',
        accordionPineRL: 'accordion-pine-tree-rl',
        accordionPineLR: 'accordion-pine-tree-lr',
        hugglehenFarmEntrance: 'hugglehen-farms-entrance'
      };
      decor = [];
      missing = [];

      for ({
        group,
        layer: _l
      } of flat) {
        if (_l.type !== 'imagelayer' || _l.visible === false) continue;
        p = props(_l);
        imgPath = (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
          error: Error()
        }), path) : path).normalize((_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
          error: Error()
        }), path) : path).join(MAPS, _l.image));
        base = (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
          error: Error()
        }), path) : path).basename(_l.image, '.png').replace(/-still$/, '');
        sheet = void 0;
        frames = void 0;
        animated = !!p.animated;

        if (animated || !(_crd && fs === void 0 ? (_reportPossibleCrUseOffs({
          error: Error()
        }), fs) : fs).existsSync(imgPath)) {
          s = findSheet(_l.name, base);

          if (!s) {
            missing.push(_l.name + " (" + _l.image + ")");
            continue;
          }

          sheet = writeSheet(s.name, s.png, s.json);
          frames = readJson((_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
            error: Error()
          }), path) : path).join(OUT, 'sheets', sheet + '-frames.json')).order;
          if (!animated) frames = frames.slice(0, 1);
        } else {
          sheet = writeSheet('img-' + base, imgPath, null);
          frames = ['0'];
        }

        decor.push({
          name: _l.name,
          layer: group === 'objectsAbove' ? 'above' : 'below',
          sheet,
          frames,
          fps: p.frameRate || 0,
          loop: p.repeat === undefined ? true : p.repeat !== 0,
          x: Math.round(_l.offsetx || 0),
          y: Math.round(_l.offsety || 0),
          w: _l.imagewidth,
          h: _l.imageheight,
          sortY: Math.round((_l.offsety || 0) + ((_p$z = p.z) != null ? _p$z : _l.imageheight)),
          opacity: (_l$opacity = _l.opacity) != null ? _l$opacity : 1
        });
      } // --- Ô chặn, object --------------------------------------------------------


      blockedLayer = byName('blocked');
      blocked = blockedLayer ? blockedLayer.data.map(v => v ? '1' : '0').join('') : '0'.repeat(W * H);
      code = flat.filter(e => e.layer.type === 'objectgroup').flatMap(e => e.layer.objects);

      rect = o => ({
        x: o.x,
        y: o.y,
        w: o.width,
        h: o.height
      });

      objs = n => code.filter(o => o.name === n && o.visible !== false);

      teleports = objs('teleport').map(o => {
        var p = props(o);
        return _extends({}, rect(o), {
          dest: p.destinationRoom,
          destX: p.destinationX,
          destY: p.destinationY,
          dirIn: p.directionIn,
          dirOut: p.directionOut
        });
      }); // Điểm xuất hiện: nơi các phòng khác dịch chuyển tới phòng này.

      spawn = null;

      for (f of (_crd && fs === void 0 ? (_reportPossibleCrUseOffs({
        error: Error()
      }), fs) : fs).readdirSync(MAPS).filter(f => f.endsWith('.json'))) {
        if (f === ROOM + '.json') continue;

        for ({
          layer
        } of walk(readJson((_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
          error: Error()
        }), path) : path).join(MAPS, f)).layers)) {
          if (layer.type !== 'objectgroup') continue;

          for (o of layer.objects) {
            _p = props(o);
            if (o.name === 'teleport' && _p.destinationRoom === ROOM && !spawn) spawn = {
              x: _p.destinationX,
              y: _p.destinationY,
              dir: _p.directionOut || 'down',
              from: f.replace('.json', '')
            };
          }
        }
      }

      if (!spawn) spawn = {
        x: W * TW / 2,
        y: H * TH / 2,
        dir: 'down',
        from: null
      }; // Vùng có tile (camera không đi ra ngoài vùng này).

      bx0 = W;
      by0 = H;
      bx1 = -1;
      by1 = -1;

      for (_l2 of below.concat(above)) _l2.data.forEach((g, i) => {
        if (!g) return;
        var x = i % W,
            y = Math.floor(i / W);
        if (x < bx0) bx0 = x;
        if (x > bx1) bx1 = x;
        if (y < by0) by0 = y;
        if (y > by1) by1 = y;
      });

      bounds = bx1 < 0 ? {
        x: 0,
        y: 0,
        w: W * TW,
        h: H * TH
      } : {
        x: bx0 * TW,
        y: by0 * TH,
        w: (bx1 - bx0 + 1) * TW,
        h: (by1 - by0 + 1) * TH
      };
      room = {
        name: ROOM,
        bounds,
        tileW: TW,
        tileH: TH,
        cols: W,
        rows: H,
        pxW: W * TW,
        pxH: H * TH,
        maps: {
          below: "maps/" + ROOM + "/" + ROOM + "-below",
          above: above.length ? "maps/" + ROOM + "/" + ROOM + "-above" : null
        },
        blocked,
        colliders: objs('collider').map(rect),
        fishing: objs('fishing').map(o => _extends({}, rect(o), {
          dir: props(o).direction || 'down'
        })),
        botFishingSpots: objs('botFishingSpot').map(o => ({
          x: o.x,
          y: o.y,
          dir: props(o).direction || 'down'
        })),
        seats: objs('seat').map(o => _extends({}, rect(o), props(o))),
        signs: objs('sign').map(o => _extends({}, rect(o), props(o))),
        teleports,
        spawn,
        decor
      };
      mkdirp((_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(OUT, 'rooms'));
      (_crd && fs === void 0 ? (_reportPossibleCrUseOffs({
        error: Error()
      }), fs) : fs).writeFileSync((_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(OUT, 'rooms', ROOM + '.json'), JSON.stringify(room)); // ---------------------------------------------------------------------------
      // Sheet dùng chung: nhân vật, câu cá, NPC, UI
      // ---------------------------------------------------------------------------

      SS = (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(A, 'spritesheets');
      shared = [['player-spritesheet-skin-1', 'player-spritesheet-skin-1.png', 'player-spritesheet.json'], ['player-spritesheet-skin-2', 'player-spritesheet-skin-2.png', 'player-spritesheet.json'], ['player-spritesheet-skin-3', 'player-spritesheet-skin-3.png', 'player-spritesheet.json'], ['player-fishing-skin-1', 'player-fishing-spritesheet-skin-1.png', 'player-fishing-spritesheet.json'], ['player-fishing-skin-2', 'player-fishing-spritesheet-skin-2.png', 'player-fishing-spritesheet.json'], ['player-fishing-skin-3', 'player-fishing-spritesheet-skin-3.png', 'player-fishing-spritesheet.json'], ['hair-spritesheet', 'hair-spritesheet.png', 'hair-spritesheet.json'], ['hair-2-spritesheet', 'hair-2-spritesheet.png', 'hair-2-spritesheet.json'], ['tops-spritesheet', 'tops-spritesheet.png', 'tops-spritesheet.json'], ['bottoms-spritesheet', 'bottoms-spritesheet.png', 'bottoms-spritesheet.json'], ['fishing-rods', 'fishing-rods-spritesheet.png', 'fishing-rods-spritesheet.json'], ['fishing-caught', 'fishing-caught-spritesheet.png', 'fishing-caught-spritesheet.json'], ['fishing-hooked-alert', 'fishing-hooked-alert-spritesheet.png', 'fishing-hooked-alert-spritesheet.json'], ['speech-bubble', 'speech-bubble-spritesheet.png', 'speech-bubble-spritesheet.json']];

      for ([n, png, json] of shared) {
        _p2 = (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
          error: Error()
        }), path) : path).join(SS, png);
        j = (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
          error: Error()
        }), path) : path).join(SS, json);
        if ((_crd && fs === void 0 ? (_reportPossibleCrUseOffs({
          error: Error()
        }), fs) : fs).existsSync(_p2) && (_crd && fs === void 0 ? (_reportPossibleCrUseOffs({
          error: Error()
        }), fs) : fs).existsSync(j)) writeSheet(n, _p2, j);else missing.push(n);
      } // Quần áo lúc câu cá: mỗi kiểu một sheet riêng.


      for (kind of ['tops', 'bottoms']) {
        d = (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
          error: Error()
        }), path) : path).join(SS, kind, 'fishing');
        if (!(_crd && fs === void 0 ? (_reportPossibleCrUseOffs({
          error: Error()
        }), fs) : fs).existsSync(d)) continue;

        for (_f of (_crd && fs === void 0 ? (_reportPossibleCrUseOffs({
          error: Error()
        }), fs) : fs).readdirSync(d).filter(f => f.endsWith('.png'))) {
          _j = (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
            error: Error()
          }), path) : path).join(d, _f.replace('.png', '.json'));
          if ((_crd && fs === void 0 ? (_reportPossibleCrUseOffs({
            error: Error()
          }), fs) : fs).existsSync(_j)) writeSheet(_f.replace('.png', '').replace('fishing-clothes-spritesheet-', 'fishing-'), (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
            error: Error()
          }), path) : path).join(d, _f), _j);
        }
      } // NPC + chân dung


      NPC_DIR = (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(SS, 'npcs');

      for (_f2 of (_crd && fs === void 0 ? (_reportPossibleCrUseOffs({
        error: Error()
      }), fs) : fs).readdirSync(NPC_DIR).filter(f => f.endsWith('-spritesheet.png'))) {
        _j2 = (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
          error: Error()
        }), path) : path).join(NPC_DIR, _f2.replace('.png', '.json'));
        if ((_crd && fs === void 0 ? (_reportPossibleCrUseOffs({
          error: Error()
        }), fs) : fs).existsSync(_j2)) writeSheet('npc-' + _f2.replace('-spritesheet.png', ''), (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
          error: Error()
        }), path) : path).join(NPC_DIR, _f2), _j2);
      }

      PORT = (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(NPC_DIR, 'portraits');
      if ((_crd && fs === void 0 ? (_reportPossibleCrUseOffs({
        error: Error()
      }), fs) : fs).existsSync(PORT)) for (_f3 of (_crd && fs === void 0 ? (_reportPossibleCrUseOffs({
        error: Error()
      }), fs) : fs).readdirSync(PORT).filter(f => f.endsWith('.png'))) writeSheet('portrait-' + _f3.replace('-portrait.png', ''), (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(PORT, _f3), null); // UI

      G = (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(A, 'graphics');
      writeSheet('ui-buttons', (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(G, 'spritesheets', 'button-spritesheet.png'), (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(G, 'spritesheets', 'button-spritesheet.json'));
      writeSheet('ui-quest-markers', (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(G, 'spritesheets', 'quest-markers-spritesheet.png'), (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(G, 'spritesheets', 'quest-markers-spritesheet.json'));
      writeSheet('ui-npc-name-tag', (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(G, 'npc-name-tag.png'), null);
      writeSheet('ui-name-tag', (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(G, 'name-tag.png'), null);
      MENU = (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(REF, 'images', 'menu');
      if ((_crd && fs === void 0 ? (_reportPossibleCrUseOffs({
        error: Error()
      }), fs) : fs).existsSync(MENU)) for (_f4 of (_crd && fs === void 0 ? (_reportPossibleCrUseOffs({
        error: Error()
      }), fs) : fs).readdirSync(MENU).filter(f => f.endsWith('-icon.png'))) writeSheet('menu-' + _f4.replace('.png', ''), (_crd && path === void 0 ? (_reportPossibleCrUseOfpath({
        error: Error()
      }), path) : path).join(MENU, _f4), null);
      console.log("Room " + ROOM + ": " + below.length + " layer d\u01B0\u1EDBi, " + above.length + " layer tr\xEAn, " + decor.length + " decor, " + (room.fishing.length + " v\xF9ng c\xE2u, " + teleports.length + " c\u1ED5ng, spawn (" + spawn.x + ", " + spawn.y + ") t\u1EEB " + spawn.from));
      console.log("\u0110\xE3 ghi " + writtenSheets.size + " sprite sheet v\xE0o assets/resources/sheets");
      if (missing.length) console.log('Không tìm thấy ảnh cho:', missing.join(', '));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=ee115ef46e0eec839dac7d07069a1250ce3aba5e.js.map