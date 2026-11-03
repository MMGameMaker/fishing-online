'use strict';
// Writes a Cocos Creator 3.8 image .meta of type "sprite-frame".
// Modelled on the editor's own default_sprite_splash.png.meta, and verified by
// letting the editor import a file produced this way (it generated the expected
// @6c48a texture and @f9941 spriteFrame sub-assets).
const fs = require('fs');

/**
 * @param {string} metaPath  destination, e.g. ".../foo.png.meta"
 * @param {string} uuid      36-char uuid for the image asset
 * @param {string} name      display name, usually the file's basename
 * @param {number} w         image width in pixels
 * @param {number} h         image height in pixels
 * @param {boolean} hasAlpha whether the image has transparency
 */
function writeSpriteFrameMeta(metaPath, uuid, name, w, h, hasAlpha = true) {
    const meta = {
        ver: '1.0.27',
        importer: 'image',
        imported: true,
        uuid,
        files: ['.json', '.png'],
        subMetas: {
            '6c48a': {
                ver: '1.0.22',
                importer: 'texture',
                uuid: uuid + '@6c48a',
                imported: true,
                files: ['.json'],
                subMetas: {},
                userData: {
                    wrapModeS: 'clamp-to-edge',
                    wrapModeT: 'clamp-to-edge',
                    minfilter: 'nearest',
                    magfilter: 'nearest',
                    mipfilter: 'none',
                    premultiplyAlpha: false,
                    anisotropy: 0,
                    isUuid: true,
                    imageUuidOrDatabaseUri: uuid,
                    visible: false,
                },
                displayName: name,
                id: '6c48a',
                name: 'texture',
            },
            f9941: {
                ver: '1.0.12',
                importer: 'sprite-frame',
                uuid: uuid + '@f9941',
                imported: true,
                files: ['.json'],
                subMetas: {},
                userData: {
                    wrapModeS: 'clamp-to-edge',
                    wrapModeT: 'clamp-to-edge',
                    minfilter: 'nearest',
                    magfilter: 'nearest',
                    premultiplyAlpha: false,
                    generateMipmap: false,
                    anisotropy: 1,
                    // "none" keeps every frame the same size, so the character
                    // does not jitter between frames with different empty margins.
                    trimType: 'none',
                    trimThreshold: 1,
                    rotated: false,
                    offsetX: 0,
                    offsetY: 0,
                    trimX: 0,
                    trimY: 0,
                    width: w,
                    height: h,
                    rawWidth: w,
                    rawHeight: h,
                    borderTop: 0,
                    borderBottom: 0,
                    borderLeft: 0,
                    borderRight: 0,
                    isUuid: true,
                    imageUuidOrDatabaseUri: uuid + '@6c48a',
                    atlasUuid: '',
                    mipfilter: 'none',
                    packable: false,
                    vertices: {
                        rawPosition: [
                            -w / 2, -h / 2, 0,
                            w / 2, -h / 2, 0,
                            -w / 2, h / 2, 0,
                            w / 2, h / 2, 0,
                        ],
                        indexes: [0, 1, 2, 2, 1, 3],
                        uv: [0, h, w, h, 0, 0, w, 0],
                        nuv: [0, 0, 1, 0, 0, 1, 1, 1],
                        minPos: [-w / 2, -h / 2, 0],
                        maxPos: [w / 2, h / 2, 0],
                    },
                    pixelsToUnit: 100,
                    pivotX: 0.5,
                    pivotY: 0.5,
                    meshType: 0,
                },
                displayName: name,
                id: 'f9941',
                name: 'spriteFrame',
            },
        },
        userData: {
            type: 'sprite-frame',
            redirect: uuid + '@f9941',
            hasAlpha,
            fixAlphaTransparencyArtifacts: false,
        },
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf8');
}

module.exports = { writeSpriteFrameMeta };
