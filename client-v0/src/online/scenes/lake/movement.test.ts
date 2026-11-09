import { describe, expect, it } from 'vitest';
import {
  MoveSender,
  RemoteMotion,
  directionFromVector,
  joystickVector,
  vectorToTarget,
  type MoveMessage,
} from './movement';

describe('MoveSender', () => {
  it('tối đa 10 lần/giây khi đang đi', () => {
    const sent: MoveMessage[] = [];
    const sender = new MoveSender((m) => sent.push(m));
    for (let t = 0; t < 1000; t += 16) sender.update(t, t, 0, 'right', true);
    expect(sent.length).toBeLessThanOrEqual(10);
    expect(sent.length).toBeGreaterThanOrEqual(9);
  });

  it('gửi một lần khi dừng, seq tăng dần, đứng yên thì không gửi', () => {
    const sent: MoveMessage[] = [];
    const sender = new MoveSender((m) => sent.push(m));
    sender.update(0, 1, 1, 'up', true);
    sender.update(10, 2, 2, 'up', false);
    sender.update(500, 2, 2, 'up', false);
    expect(sent.map((m) => m.seq)).toEqual([1, 2]);
    expect(sent[1]).toMatchObject({ x: 2, y: 2 });
  });
});

describe('RemoteMotion', () => {
  it('nội suy tới vị trí mới trong 100 ms', () => {
    const motion = new RemoteMotion(0, 0);
    motion.setTarget(100, 0, 1000);
    expect(motion.sample(1000).x).toBe(0);
    expect(motion.sample(1050).x).toBe(50);
    expect(motion.sample(1100).x).toBe(100);
    expect(motion.sample(1500).x).toBe(100);
  });

  it('đích mới tính từ vị trí đang hiển thị, không giật', () => {
    const motion = new RemoteMotion(0, 0);
    motion.setTarget(100, 0, 0);
    motion.setTarget(200, 0, 50);
    expect(motion.sample(50).x).toBe(50);
    expect(motion.sample(150).x).toBe(200);
  });

  it('báo moving rồi trở về đứng yên', () => {
    const motion = new RemoteMotion(0, 0);
    expect(motion.sample(0).moving).toBe(false);
    motion.setTarget(10, 0, 0);
    expect(motion.sample(120).moving).toBe(true);
    expect(motion.sample(400).moving).toBe(false);
  });
});

describe('hướng và vector', () => {
  it('directionFromVector', () => {
    expect(directionFromVector(1, 0, 'up')).toBe('right');
    expect(directionFromVector(-3, 1, 'up')).toBe('left');
    expect(directionFromVector(0, 2, 'up')).toBe('down');
    expect(directionFromVector(0, -2, 'left')).toBe('up');
    expect(directionFromVector(0, 0, 'left')).toBe('left');
  });

  it('vectorToTarget dừng khi tới nơi', () => {
    expect(vectorToTarget(0, 0, 1, 1).arrived).toBe(true);
    const v = vectorToTarget(0, 0, 30, 40);
    expect(v.x).toBeCloseTo(0.6);
    expect(v.y).toBeCloseTo(0.8);
  });

  it('joystickVector có vùng chết và giới hạn độ dài', () => {
    expect(joystickVector(2, 0, 40)).toEqual({ x: 0, y: 0 });
    expect(joystickVector(20, 0, 40)).toEqual({ x: 0.5, y: 0 });
    expect(joystickVector(400, 0, 40)).toEqual({ x: 1, y: 0 });
  });
});
