'use strict';
const fs = require('fs');
const path = require('path');

const BASE64_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_VALUES = {};
for (let i = 0; i < 64; i++) BASE64_VALUES[BASE64_KEYS[i]] = i;
const HexChars = '0123456789abcdef';

/** Inverse of cc decodeUuid: 36-char uuid -> 22-char compressed form. */
function compressUuid(uuid) {
    const hex = uuid.replace(/-/g, '');
    if (hex.length !== 32) throw new Error('bad uuid: ' + uuid);
    let out = hex.slice(0, 2);
    for (let i = 2; i < 32; i += 3) {
        const h0 = parseInt(hex[i], 16);
        const h1 = parseInt(hex[i + 1], 16);
        const h2 = parseInt(hex[i + 2], 16);
        const lhs = (h0 << 2) | (h1 >> 2);
        const rhs = ((h1 & 3) << 4) | h2;
        out += BASE64_KEYS[lhs] + BASE64_KEYS[rhs];
    }
    return out;
}

/** Port of cc decodeUuid, used to verify compressUuid round-trips. */
function decodeUuid(base64) {
    if (base64.length !== 22) return base64;
    let hex = base64.slice(0, 2);
    for (let i = 2; i < 22; i += 2) {
        const lhs = BASE64_VALUES[base64[i]];
        const rhs = BASE64_VALUES[base64[i + 1]];
        hex += HexChars[lhs >> 2];
        hex += HexChars[((lhs & 3) << 2) | (rhs >> 4)];
        hex += HexChars[rhs & 0xf];
    }
    return [
        hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16),
        hex.slice(16, 20), hex.slice(20, 32),
    ].join('-');
}

// --- Verify against the documented example in cocos/core/utils/decode-uuid.ts ---
const EXAMPLE_COMPRESSED = 'fcmR3XADNLgJ1ByKhqcC5Z';
const EXAMPLE_UUID = 'fc991dd7-0033-4b80-9d41-c8a86a702e59';
if (decodeUuid(EXAMPLE_COMPRESSED) !== EXAMPLE_UUID) {
    throw new Error('decodeUuid mismatch: got ' + decodeUuid(EXAMPLE_COMPRESSED));
}
if (compressUuid(EXAMPLE_UUID) !== EXAMPLE_COMPRESSED) {
    throw new Error('compressUuid mismatch: got ' + compressUuid(EXAMPLE_UUID));
}
console.log('Asset-uuid compression (2+20) verified against Cocos example.');

/**
 * Script class ids use a DIFFERENT variant than asset uuids: Cocos keeps the
 * first 5 hex chars literally, then compresses the remaining 27 hex chars in
 * triples, giving a 23-char id. This is the value emitted as
 * `_RF.push({}, "<id>", "<ClassName>")` in the compiled script, and it is what
 * a scene must use as a component's `__type__`.
 */
function compressScriptUuid(uuid) {
    const hex = uuid.replace(/-/g, '');
    if (hex.length !== 32) throw new Error('bad uuid: ' + uuid);
    let out = hex.slice(0, 5);
    for (let i = 5; i < 32; i += 3) {
        const h0 = parseInt(hex[i], 16);
        const h1 = parseInt(hex[i + 1], 16);
        const h2 = parseInt(hex[i + 2], 16);
        const lhs = (h0 << 2) | (h1 >> 2);
        const rhs = ((h1 & 3) << 4) | h2;
        out += BASE64_KEYS[lhs] + BASE64_KEYS[rhs];
    }
    return out;
}

// Verified against class ids observed in real compiled output (`_RF.push` calls):
// the first two from this project's temp/programming chunks, the third from the
// engine's own builtin-dof-pass.ts paired with the uuid in its .meta.
const SCRIPT_ID_SAMPLES = [
    ['b1c2d3e4-5f60-4a71-8b82-9c0d1e2f3a4b', 'b1c2dPkX2BKcYuCnA0eLzpL'],
    ['a1b2c3d4-bbbb-4bbb-8bbb-000000000002', 'a1b2cPUu7tLu4u7AAAAAAAC'],
    ['11f3130e-c08c-47bb-a209-71d114594e6d', '11f31MOwIxHu6IJcdEUWU5t'],
];
for (const [uuid, expected] of SCRIPT_ID_SAMPLES) {
    const got = compressScriptUuid(uuid);
    if (got !== expected) {
        throw new Error(`compressScriptUuid(${uuid}) = ${got}, expected ${expected}`);
    }
}
console.log('Script class-id compression (5+18) verified against', SCRIPT_ID_SAMPLES.length, 'compiled samples.');

// --- Fixed identifiers -------------------------------------------------------
const SCENE_UUID = 'a1b2c3d4-aaaa-4aaa-8aaa-000000000001';
const SCRIPT_UUID = 'b1c2d3e4-5f60-4a71-8b82-9c0d1e2f3a4b';
const JOYSTICK_UUID = 'c1d2e3f4-6a70-4b81-9c92-ad0e1f2a3b4c';
const ANIMATOR_UUID = 'f1a2b3c4-7c80-4d91-8e02-bf1a2c3d4e5f';
const SCRIPT_CLASS_ID = compressScriptUuid(SCRIPT_UUID);
const JOYSTICK_CLASS_ID = compressScriptUuid(JOYSTICK_UUID);
const ANIMATOR_CLASS_ID = compressScriptUuid(ANIMATOR_UUID);

// Character frames sliced by tools/gen-character.js.
const CHAR = JSON.parse(fs.readFileSync(path.join(__dirname, 'character-frames.json'), 'utf8'));

// Built-in Cocos sprite frames (uuids read from the installed 3.8.8 editor assets).
const SF_SQUARE = '7d8f9b89-4fd1-4c9f-a3ab-38ec7cded7ca@f9941';  // default_sprite_splash
const SF_CIRCLE = 'f12a23c4-b924-4322-a260-3d982428f1e8@f9941';  // default_radio_button_off

// Lake map composed from the project's tileset by gen-map.js.
const SF_MAP = 'd1e2f3a4-7b80-4c91-ad02-be1f2a3b4c5d@f9941';

console.log('PlayerController class id    :', SCRIPT_CLASS_ID);
console.log('VirtualJoystick  class id    :', JOYSTICK_CLASS_ID);

// --- Deterministic node ids --------------------------------------------------
let idCounter = 0;
function nodeId() {
    // 22 chars from the base64 alphabet, deterministic so reruns are stable.
    let n = ++idCounter;
    let s = '';
    for (let i = 0; i < 22; i++) {
        s += BASE64_KEYS[(n * 31 + i * 17 + 7) % 64];
        n = Math.floor(n / 3) + i;
    }
    return s;
}

// --- Layout ------------------------------------------------------------------
const VIEW_W = 960;
const VIEW_H = 640;
// Must match gen-map.js: 40x30 tiles of 16px, baked at scale 3.
const MAP_W = 1920;
const MAP_H = 1440;
const EDGE_PADDING = 48;     // rock border around the map
const LAKE_RX = 624;         // water ellipse
const LAKE_RY = 384;
const PLAYER_SIZE = 96;      // 32px frame baked at scale 3, same scale as the map
const PLAYER_HALF = 20;      // collision half-width; the body is ~14px wide at 1x
const PLAYER_START_Y = -500; // on the shore below the lake

const objs = [];
const push = (o) => (objs.push(o), objs.length - 1);
const ref = (i) => ({ __id__: i });

const vec3 = (x, y, z) => ({ __type__: 'cc.Vec3', x, y, z });
const quatId = () => ({ __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 });
const color = (r, g, b, a = 255) => ({ __type__: 'cc.Color', r, g, b, a });
const size = (width, height) => ({ __type__: 'cc.Size', width, height });
const vec2 = (x, y) => ({ __type__: 'cc.Vec2', x, y });

const LAYER_UI = 33554432;
const LAYER_DEFAULT = 1073741824;

function makeNode(name, parentIdx, pos, layer = LAYER_UI) {
    return {
        __type__: 'cc.Node',
        _name: name,
        _objFlags: 0,
        _parent: parentIdx === null ? null : ref(parentIdx),
        _children: [],
        _active: true,
        _components: [],
        _prefab: null,
        _lpos: vec3(pos[0], pos[1], pos[2] || 0),
        _lrot: quatId(),
        _lscale: vec3(1, 1, 1),
        _layer: layer,
        _euler: vec3(0, 0, 0),
        _id: nodeId(),
    };
}

function uiTransform(nodeIdx, w, h) {
    return {
        __type__: 'cc.UITransform',
        _name: '',
        _objFlags: 0,
        node: ref(nodeIdx),
        _enabled: true,
        __prefab: null,
        _contentSize: size(w, h),
        _anchorPoint: vec2(0.5, 0.5),
        _id: nodeId(),
    };
}

function sprite(nodeIdx, col, frame = SF_SQUARE) {
    return {
        __type__: 'cc.Sprite',
        _name: '',
        _objFlags: 0,
        node: ref(nodeIdx),
        _enabled: true,
        __prefab: null,
        _customMaterial: null,
        _srcBlendFactor: 2,
        _dstBlendFactor: 4,
        _color: col,
        _spriteFrame: { __uuid__: frame, __expectedType__: 'cc.SpriteFrame' },
        _type: 0,          // SIMPLE
        _fillType: 0,
        _sizeMode: 0,      // CUSTOM -> respect contentSize
        _fillCenter: vec2(0, 0),
        _fillStart: 0,
        _fillRange: 0,
        _isTrimmedMode: true,
        _useGrayscale: false,
        _atlas: null,
        _id: nodeId(),
    };
}

// =============================================================================
// 0: SceneAsset   1: Scene   2: Canvas node
// =============================================================================
push({ __type__: 'cc.SceneAsset', _name: 'Main', _objFlags: 0, _native: '', scene: ref(1) });

const sceneIdx = push({
    __type__: 'cc.Scene',
    _name: 'Main',
    _objFlags: 0,
    _parent: null,
    _children: [],
    _active: true,
    _components: [],
    _prefab: null,
    autoReleaseAssets: false,
    _globals: null,
    _id: SCENE_UUID,
});

const canvasIdx = push(makeNode('Canvas', sceneIdx, [VIEW_W / 2, VIEW_H / 2, 0]));
objs[sceneIdx]._children.push(ref(canvasIdx));

// Camera node (child of Canvas, DEFAULT layer like the Cocos 2D template)
const camNodeIdx = push(makeNode('Camera', canvasIdx, [0, 0, 1000], LAYER_DEFAULT));
objs[canvasIdx]._children.push(ref(camNodeIdx));

const camCompIdx = push({
    __type__: 'cc.Camera',
    _name: '',
    _objFlags: 0,
    node: ref(camNodeIdx),
    _enabled: true,
    __prefab: null,
    _projection: 0,             // ORTHO -> 2D
    _priority: 0,
    _fov: 45,
    _fovAxis: 0,
    _orthoHeight: VIEW_H / 2,
    _near: 0,
    _far: 2000,
    _color: color(26, 54, 92),  // nen ngoai map
    _depth: 1,
    _stencil: 0,
    _clearFlags: 7,
    _rect: { __type__: 'cc.Rect', x: 0, y: 0, width: 1, height: 1 },
    _aperture: 19,
    _shutter: 7,
    _iso: 0,
    _screenScale: 1,
    _visibility: 1108344832,    // DEFAULT | UI_2D
    _targetTexture: null,
    _id: nodeId(),
});
objs[camNodeIdx]._components.push(ref(camCompIdx));

// Canvas components
const canvasUtIdx = push(uiTransform(canvasIdx, VIEW_W, VIEW_H));
const canvasCompIdx = push({
    __type__: 'cc.Canvas',
    _name: '',
    _objFlags: 0,
    node: ref(canvasIdx),
    _enabled: true,
    __prefab: null,
    _cameraComponent: ref(camCompIdx),
    _alignCanvasWithScreen: true,
    _id: nodeId(),
});
const canvasWidgetIdx = push({
    __type__: 'cc.Widget',
    _name: '',
    _objFlags: 0,
    node: ref(canvasIdx),
    _enabled: true,
    __prefab: null,
    _alignFlags: 45,
    _target: null,
    _left: 0,
    _right: 0,
    _top: 0,
    _bottom: 0,
    _horizontalCenter: 0,
    _verticalCenter: 0,
    _isAbsLeft: true,
    _isAbsRight: true,
    _isAbsTop: true,
    _isAbsBottom: true,
    _isAbsHorizontalCenter: true,
    _isAbsVerticalCenter: true,
    _originalWidth: 0,
    _originalHeight: 0,
    _alignMode: 2,
    _lockFlags: 0,
    _id: nodeId(),
});
objs[canvasIdx]._components.push(ref(canvasUtIdx), ref(canvasCompIdx), ref(canvasWidgetIdx));

// --- World (moved by the camera-follow logic) --------------------------------
const worldIdx = push(makeNode('World', canvasIdx, [0, 0, 0]));
objs[canvasIdx]._children.push(ref(worldIdx));
objs[worldIdx]._components.push(ref(push(uiTransform(worldIdx, MAP_W, MAP_H))));

// --- Map: one sprite holding the whole composed lake map --------------------
const mapIdx = push(makeNode('Map', worldIdx, [0, 0, 0]));
objs[worldIdx]._children.push(ref(mapIdx));
objs[mapIdx]._components.push(ref(push(uiTransform(mapIdx, MAP_W, MAP_H))));
objs[mapIdx]._components.push(ref(push(sprite(mapIdx, color(255, 255, 255), SF_MAP))));

// --- Player (sibling of Map inside World) ------------------------------------
const playerIdx = push(makeNode('Player', worldIdx, [0, PLAYER_START_Y, 0]));
objs[worldIdx]._children.push(ref(playerIdx));
objs[playerIdx]._components.push(ref(push(uiTransform(playerIdx, PLAYER_SIZE, PLAYER_SIZE))));

// Starts on the first idle-down frame so the editor shows the character, not a sheet.
const playerSpriteIdx = push(sprite(playerIdx, color(255, 255, 255), CHAR.frames.idle_down[0]));
objs[playerIdx]._components.push(ref(playerSpriteIdx));

// CharacterAnimator with every frame list wired up.
const frameRef = (uuid) => ({ __uuid__: uuid, __expectedType__: 'cc.SpriteFrame' });
const frameList = (key) => CHAR.frames[key].map(frameRef);

const animIdx = push({
    __type__: ANIMATOR_CLASS_ID,
    _name: '',
    _objFlags: 0,
    node: ref(playerIdx),
    _enabled: true,
    __prefab: null,
    target: ref(playerSpriteIdx),
    idleDown: frameList('idle_down'),
    idleLeft: frameList('idle_left'),
    idleRight: frameList('idle_right'),
    idleUp: frameList('idle_up'),
    walkDown: frameList('walk_down'),
    walkLeft: frameList('walk_left'),
    walkRight: frameList('walk_right'),
    walkUp: frameList('walk_up'),
    idleFps: 4,
    walkFps: 10,
    _id: nodeId(),
});
objs[playerIdx]._components.push(ref(animIdx));

// --- Virtual joystick (child of Canvas so it stays fixed on screen) ---------
const JOY_BASE = 190;
const JOY_KNOB = 86;
const JOY_RADIUS = 60;

const joyIdx = push(makeNode('Joystick', canvasIdx, [-VIEW_W / 2 + 140, -VIEW_H / 2 + 140, 0]));
objs[canvasIdx]._children.push(ref(joyIdx));
objs[joyIdx]._components.push(ref(push(uiTransform(joyIdx, JOY_BASE, JOY_BASE))));
objs[joyIdx]._components.push(ref(push(sprite(joyIdx, color(255, 255, 255, 70), SF_CIRCLE))));

const knobIdx = push(makeNode('Knob', joyIdx, [0, 0, 0]));
objs[joyIdx]._children.push(ref(knobIdx));
objs[knobIdx]._components.push(ref(push(uiTransform(knobIdx, JOY_KNOB, JOY_KNOB))));
objs[knobIdx]._components.push(ref(push(sprite(knobIdx, color(245, 245, 245, 220), SF_CIRCLE))));

const joyCompIdx = push({
    __type__: JOYSTICK_CLASS_ID,
    _name: '',
    _objFlags: 0,
    node: ref(joyIdx),
    _enabled: true,
    __prefab: null,
    knob: ref(knobIdx),
    radius: JOY_RADIUS,
    deadZone: 0.15,
    _id: nodeId(),
});
objs[joyIdx]._components.push(ref(joyCompIdx));

// PlayerController component, bound by the script's compressed class id
const pcIdx = push({
    __type__: SCRIPT_CLASS_ID,
    _name: '',
    _objFlags: 0,
    node: ref(playerIdx),
    _enabled: true,
    __prefab: null,
    speed: 520,
    world: ref(worldIdx),
    joystick: ref(joyCompIdx),
    animator: ref(animIdx),
    mapWidth: MAP_W,
    mapHeight: MAP_H,
    edgePadding: EDGE_PADDING,
    lakeRadiusX: LAKE_RX,
    lakeRadiusY: LAKE_RY,
    viewWidth: VIEW_W,
    viewHeight: VIEW_H,
    halfSize: PLAYER_HALF,
    _id: nodeId(),
});
objs[playerIdx]._components.push(ref(pcIdx));

// --- HUD label ---------------------------------------------------------------
const hudIdx = push(makeNode('HUD', canvasIdx, [0, VIEW_H / 2 - 40, 0]));
objs[canvasIdx]._children.push(ref(hudIdx));
objs[hudIdx]._components.push(ref(push(uiTransform(hudIdx, 600, 40))));
objs[hudIdx]._components.push(ref(push({
    __type__: 'cc.Label',
    _name: '',
    _objFlags: 0,
    node: ref(hudIdx),
    _enabled: true,
    __prefab: null,
    _customMaterial: null,
    _srcBlendFactor: 2,
    _dstBlendFactor: 4,
    _color: color(255, 255, 255),
    _string: 'WASD / phim mui ten, hoac keo joystick. Khong di duoc xuong nuoc.',
    _horizontalAlign: 1,
    _verticalAlign: 1,
    _actualFontSize: 24,
    _fontSize: 24,
    _fontFamily: 'Arial',
    _lineHeight: 30,
    _overflow: 0,
    _enableWrapText: true,
    _font: null,
    _isSystemFontUsed: true,
    _spacingX: 0,
    _isItalic: false,
    _isBold: false,
    _isUnderline: false,
    _underlineHeight: 2,
    _cacheMode: 0,
    _id: nodeId(),
})));

// --- Scene globals (mirrors the Cocos 2D scene template) ---------------------
const globalsIdx = push({
    __type__: 'cc.SceneGlobals',
    ambient: null,
    shadows: null,
    _skybox: null,
    fog: null,
    octree: null,
    skin: null,
});
objs[sceneIdx]._globals = ref(globalsIdx);

objs[globalsIdx].ambient = ref(push({
    __type__: 'cc.AmbientInfo',
    _skyColorHDR: { __type__: 'cc.Vec4', x: 0, y: 0, z: 0, w: 0.520833125 },
    _skyColor: { __type__: 'cc.Vec4', x: 0, y: 0, z: 0, w: 0.520833125 },
    _skyIllumHDR: 20000,
    _skyIllum: 20000,
    _groundAlbedoHDR: { __type__: 'cc.Vec4', x: 0, y: 0, z: 0, w: 0 },
    _groundAlbedo: { __type__: 'cc.Vec4', x: 0, y: 0, z: 0, w: 0 },
    _skyColorLDR: { __type__: 'cc.Vec4', x: 0.2, y: 0.5, z: 0.8, w: 1 },
    _skyIllumLDR: 20000,
    _groundAlbedoLDR: { __type__: 'cc.Vec4', x: 0.2, y: 0.2, z: 0.2, w: 1 },
}));
objs[globalsIdx].shadows = ref(push({
    __type__: 'cc.ShadowsInfo',
    _enabled: false,
    _type: 0,
    _normal: vec3(0, 1, 0),
    _distance: 0,
    _shadowColor: color(76, 76, 76),
    _maxReceived: 4,
    _size: vec2(512, 512),
}));
objs[globalsIdx]._skybox = ref(push({
    __type__: 'cc.SkyboxInfo',
    _envLightingType: 0,
    _envmapHDR: null,
    _envmap: null,
    _envmapLDR: null,
    _diffuseMapHDR: null,
    _diffuseMapLDR: null,
    _enabled: false,
    _useHDR: true,
}));
objs[globalsIdx].fog = ref(push({
    __type__: 'cc.FogInfo',
    _type: 0,
    _fogColor: color(200, 200, 200),
    _enabled: false,
    _fogDensity: 0.3,
    _fogStart: 0.5,
    _fogEnd: 300,
    _fogAtten: 5,
    _fogTop: 1.5,
    _fogRange: 1.2,
    _accurate: false,
}));
objs[globalsIdx].octree = ref(push({
    __type__: 'cc.OctreeInfo',
    _enabled: false,
    _minPos: vec3(-1024, -1024, -1024),
    _maxPos: vec3(1024, 1024, 1024),
    _depth: 8,
}));
objs[globalsIdx].skin = ref(push({
    __type__: 'cc.SkinInfo',
    _enabled: false,
    _scale: 5,
}));

// --- Write -------------------------------------------------------------------
const outDir = process.argv[2] || path.join(__dirname, '..', 'assets');

const scenePath = path.join(outDir, 'Main.scene');
fs.writeFileSync(scenePath, JSON.stringify(objs, null, 2) + '\n', 'utf8');

console.log('Wrote', scenePath);
console.log('Objects:', objs.length, '| map:', MAP_W + 'x' + MAP_H, '| lake:', LAKE_RX + 'x' + LAKE_RY);
