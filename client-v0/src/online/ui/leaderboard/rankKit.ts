// Phần dùng chung của popup Bảng xếp hạng gộp (LeaderboardPopup.ts) và hai tab nội dung (WeeklyBoardView, DailyFishView):
// đường dẫn ảnh, dựng phần tử, ô hạng, mũi tên báo còn dòng, và giao diện chung của một tab.
import { UNKNOWN } from './leaderboardModel';

export const UI = (file: string) => encodeURI(`/new resources/ui/${file}`);
export const RANK = (file: string) => UI(`Rank/${file}`);
export const CLOSE = encodeURI('/mini game/Button Close.png');
export const PANEL_W = 1144;
/** Hàng tab chuyển bảng phía trên khung. */
export const TAB_ROW_H = 76;
export const PANEL_H = 812 + TAB_ROW_H;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function img(src: string, className: string): HTMLImageElement {
  const node = el('img', className);
  node.src = src;
  node.alt = '';
  node.draggable = false;
  return node;
}

export function rankCell(rank: number | null): HTMLElement {
  const cell = el('span', 'rank__rank');
  if (rank !== null && rank >= 1 && rank <= 3)
    cell.append(img(RANK(`Rank ${rank}.png`), 'rank__crown'));
  else cell.textContent = rank === null ? UNKNOWN : String(rank);
  return cell;
}

/** Mũi tên báo còn dòng bên dưới: mờ đi khi danh sách đã kéo tới đáy (và không còn trang kế), hiện lại khi kéo lên. */
export function updateScrollHint(list: HTMLElement, hint: HTMLElement, more = false): void {
  const left = list.scrollHeight - list.clientHeight - list.scrollTop;
  hint.classList.toggle('rank__gap--off', left <= 4 && !more);
}

/** Một tab nội dung của popup Bảng xếp hạng. `root` phủ cả khung; các phần tử con tự đặt toạ độ theo khung. */
export interface RankView {
  readonly root: HTMLElement;
  /** Gọi mỗi lần tab này hiện (kể cả lần đầu): tải lại dữ liệu. */
  activate(): void;
  /** Chữ trên đồng hồ đếm ngược của tab này (theo dữ liệu đã có). */
  timerText(): string;
  /** Phím Esc: true nếu tab đã dùng phím (vd. đóng bảng chọn loài) thì popup không đóng. */
  handleEscape(): boolean;
  destroy(): void;
}

export interface RankViewOptions {
  /** Gốc UI để hiện lỗi mạng. */
  root: HTMLElement;
  services: import('../../core/services').Services;
  /** Giờ Server (đồng hồ đếm ngược); mặc định giờ máy. */
  now?: () => number;
  /** Báo popup cập nhật đồng hồ khi dữ liệu của tab đổi. */
  onTimer: () => void;
}
