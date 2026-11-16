import { describe, expect, it } from 'vitest';
import type { AchievementEntry } from '../../net/contract';
import { achievementView, titleLabel, validateName } from './profileModel';

const entry = (counter: number, claimedLevels: number): AchievementEntry => ({
  id: 'diligent',
  name: 'Cần thủ chăm chỉ',
  counter,
  thresholds: [10, 50, 200, 500, 1000],
  claimedLevels,
  rewardGold: 100,
});

describe('achievementView', () => {
  it('chưa đạt mốc: thanh theo số đếm, không chấm đỏ', () => {
    const view = achievementView(entry(4, 0));
    expect(view).toMatchObject({ level: 1, target: 10, shown: 4, claimable: false, done: false });
  });

  it('đạt mốc chưa nhận: giữ đầy mốc và có chấm đỏ dù số đếm vượt', () => {
    const view = achievementView(entry(14, 0));
    expect(view).toMatchObject({ level: 1, shown: 10, ratio: 1, claimable: true });
  });

  it('nhận xong thì hiện theo số đếm thật ở level kế (14/50)', () => {
    const view = achievementView(entry(14, 1));
    expect(view).toMatchObject({ level: 2, target: 50, shown: 14, claimable: false });
  });

  it('đủ 5 level: thanh đầy kèm dấu tích', () => {
    const view = achievementView(entry(2000, 5));
    expect(view).toMatchObject({ level: 5, ratio: 1, claimable: false, done: true });
  });
});

describe('validateName', () => {
  it('chấp nhận tên hợp lệ có dấu tiếng Việt', () => {
    expect(validateName('Cần Thủ 01')).toBeNull();
  });

  it('từ chối quá ngắn, quá dài và ký tự lạ', () => {
    expect(validateName('ab')).not.toBeNull();
    expect(validateName('a'.repeat(17))).not.toBeNull();
    expect(validateName('bad!name')).not.toBeNull();
  });
});

describe('titleLabel', () => {
  it('mặc định là Bậc thầy câu cá', () => {
    expect(titleLabel(undefined)).toBe('Bậc thầy câu cá');
    expect(titleLabel('lake_king')).toBe('Vua hồ câu');
  });
});
