// Logic thuần của popup "Tài khoản": danh hiệu, giới hạn nhập, trạng thái thành tựu.
import type { AchievementEntry } from '../../net/contract';

export const BIO_MAX = 100;
/** Giữ luật Server hiện hành (3–16). Yêu cầu 18 ký tự đã bỏ theo quyết định của người dùng 2026-11-16. */
export const NAME_MIN = 3;
export const NAME_MAX = 16;
export const NAME_PATTERN = /^[\p{L}\p{N} _]+$/u;

export interface TitleOption {
  id: string;
  label: string;
}

/** Danh hiệu tạm; 25 mục sau do Zen cung cấp 2026-11-18, 6 mục đầu do Claude đặt chờ GD duyệt. Mục đầu là mặc định. */
export const TITLES: readonly TitleOption[] = [
  { id: 'master', label: 'Bậc thầy câu cá' },
  { id: 'rookie', label: 'Tay câu mới nổi' },
  { id: 'hunter', label: 'Thợ săn cá hiếm' },
  { id: 'lake_king', label: 'Vua hồ câu' },
  { id: 'sea_friend', label: 'Bạn của biển cả' },
  { id: 'legend', label: 'Huyền thoại cần câu' },
  { id: 'tay_ho_ba_chu', label: 'Tây Hồ Bá Chủ' },
  { id: 'ngu_vuong', label: 'Ngư Vương' },
  { id: 'sat_thu_ca_chep', label: 'Sát Thủ Cá Chép' },
  { id: 'long_vuong_ho_tay', label: 'Long Vương Hồ Tây' },
  { id: 'doc_co_cau_ngu', label: 'Độc Cô Cầu Ngư' },
  { id: 'thien_ha_de_nhat_can', label: 'Thiên Hạ Đệ Nhất Cần' },
  { id: 'quy_cau', label: 'Quỷ Câu' },
  { id: 'bao_ngu', label: 'Bạo Ngư' },
  { id: 'tay_ho_kiem_thu', label: 'Tây Hồ Kiếm Thủ' },
  { id: 'than_cau', label: 'Thần Câu' },
  { id: 'hac_long_ngu', label: 'Hắc Long Ngư' },
  { id: 'ngu_ba_thien', label: 'Ngư Bá Thiên' },
  { id: 'lang_tu_cau_dem', label: 'Lãng Tử Câu Đêm' },
  { id: 'ca_chu_nhan', label: 'Cá Chủ Nhân' },
  { id: 'thiet_can', label: 'Thiết Cần' },
  { id: 'diet_ngu_dai_de', label: 'Diệt Ngư Đại Đế' },
  { id: 'tay_ho_chien_than', label: 'Tây Hồ Chiến Thần' },
  { id: 'vo_anh_cau', label: 'Vô Ảnh Câu' },
  { id: 'cau_thanh', label: 'Câu Thánh' },
  { id: 'ngu_long_ton_gia', label: 'Ngư Long Tôn Giả' },
  { id: 'long_ngu_chien_than', label: 'Long Ngư Chiến Thần' },
  { id: 'doc_nhan_ngu_vuong', label: 'Độc Nhãn Ngư Vương' },
  { id: 'huyet_ngu_dai_de', label: 'Huyết Ngư Đại Đế' },
  { id: 'thien_long_cau', label: 'Thiên Long Câu' },
  { id: 'van_ngu_chi_chu', label: 'Vạn Ngư Chi Chủ' },
];
export const DEFAULT_TITLE_ID = TITLES[0]!.id;

export function titleLabel(id: string | undefined): string {
  return (TITLES.find((t) => t.id === id) ?? TITLES[0]!).label;
}

export function validateName(value: string): string | null {
  const name = value.trim();
  if (name.length < NAME_MIN) return `Tên cần ít nhất ${NAME_MIN} ký tự.`;
  if (name.length > NAME_MAX) return `Tên tối đa ${NAME_MAX} ký tự.`;
  if (!NAME_PATTERN.test(name)) return 'Tên chỉ gồm chữ, số, khoảng trắng và dấu gạch dưới.';
  return null;
}

export const SHOWCASE_SLOTS = 3;

/** 124 (0,1 cm) → "12,4cm". */
export function formatLength(tenthCm: number): string {
  return `${(tenthCm / 10).toFixed(1).replace('.', ',')}cm`;
}

export const MAX_ACHIEVEMENT_LEVEL = 5;

export interface AchievementView {
  /** Level đang hiển thị (1..5). */
  level: number;
  /** Mốc của level đang hiển thị. */
  target: number;
  /** Số đang hiện trên thanh, không vượt mốc. */
  shown: number;
  ratio: number;
  /** Đạt mốc mà chưa nhận: hiện chấm đỏ nhấp nháy. */
  claimable: boolean;
  /** Đủ 5 level đã nhận: thanh đầy kèm dấu tích. */
  done: boolean;
}

/** Quy tắc GD: chưa nhận thì thanh giữ đầy mốc đang chờ, nhận xong thì hiện lại theo số đếm thật. */
export function achievementView(entry: AchievementEntry): AchievementView {
  const claimed = Math.min(entry.claimedLevels, MAX_ACHIEVEMENT_LEVEL);
  if (claimed >= MAX_ACHIEVEMENT_LEVEL) {
    const last = entry.thresholds[MAX_ACHIEVEMENT_LEVEL - 1] ?? 0;
    return {
      level: MAX_ACHIEVEMENT_LEVEL,
      target: last,
      shown: last,
      ratio: 1,
      claimable: false,
      done: true,
    };
  }
  const target = entry.thresholds[claimed] ?? 0;
  const shown = Math.min(entry.counter, target);
  return {
    level: claimed + 1,
    target,
    shown,
    ratio: target > 0 ? shown / target : 0,
    claimable: target > 0 && entry.counter >= target,
    done: false,
  };
}
