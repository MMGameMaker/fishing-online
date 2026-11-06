import Phaser from 'phaser';
import { BootScene, PreloadScene } from './scenes/LoadScenes';
import { WorldScene } from './scenes/WorldScene';
import { UIScene } from './scenes/UIScene';

const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#1b2838',
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.RESIZE,
        width: window.innerWidth,
        height: window.innerHeight,
        // Tránh khung 0x0 (tab ẩn lúc mở) làm WebGL lỗi framebuffer.
        min: { width: 320, height: 240 },
    },
    scene: [BootScene, PreloadScene, WorldScene, UIScene],
});

// Tiện kiểm tra trong DevTools.
(window as any).game = game;
