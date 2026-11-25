import { describe, expect, it } from 'vitest';
import {
  MoveSender,
  RemoteMotion,
  directionFromVector,
  joystickVector,
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
  // Hiển thị chậm hơn gói mới nhận 150 ms; gói đầu từ đứng yên trượt trong 100 ms trước giờ nhận.
  it('đứng yên rồi đi: trượt đều tới vị trí mới, không nhảy', () => {
    const motion = new RemoteMotion(0, 0);
    motion.setTarget(100, 0, 1000);
    expect(motion.sample(1050).x).toBe(0); // vẫn trước đoạn trượt (hiển thị t=900)
    expect(motion.sample(1100).x).toBeCloseTo(50, 5); // t hiển thị 950
    expect(motion.sample(1150).x).toBe(100);
    expect(motion.sample(1500).x).toBe(100);
  });

  it('gói tới trễ vẫn trượt liên tục, không đứng khựng', () => {
    const motion = new RemoteMotion(0, 0);
    // Gói cách nhau 100 ms nhưng có gói trễ 125 ms: bước 10 px mỗi gói.
    const arrivals = [1000, 1100, 1225, 1325];
    arrivals.forEach((t, i) => motion.setTarget((i + 1) * 10, 0, t));
    let prev = motion.sample(1200).x;
    for (let t = 1210; t <= 1450; t += 10) {
      const x = motion.sample(t).x;
      expect(x).toBeGreaterThan(prev); // luôn tiến, không đứng chờ
      prev = x;
    }
    expect(motion.sample(1500).x).toBe(40);
  });

  it('nhảy xa (đặt vào ghế) thì hiện ngay', () => {
    const motion = new RemoteMotion(0, 0);
    motion.setTarget(10, 0, 0);
    motion.setTarget(1000, 500, 500);
    expect(motion.sample(500)).toMatchObject({ x: 1000, y: 500 });
  });

  it('báo moving rồi trở về đứng yên', () => {
    const motion = new RemoteMotion(0, 0);
    expect(motion.sample(0).moving).toBe(false);
    motion.setTarget(10, 0, 0);
    expect(motion.sample(200).moving).toBe(true);
    expect(motion.sample(600).moving).toBe(false);
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

  it('joystickVector có vùng chết và giới hạn độ dài', () => {
    expect(joystickVector(2, 0, 40)).toEqual({ x: 0, y: 0 });
    expect(joystickVector(20, 0, 40)).toEqual({ x: 0.5, y: 0 });
    expect(joystickVector(400, 0, 40)).toEqual({ x: 1, y: 0 });
  });
});
