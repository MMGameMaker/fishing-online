// Kiểu dữ liệu của API cộng đồng (khớp social-kit/server: CommunityView, ShareKind). Meta đã gỡ Groups API (22/4/2024) nên Server
// không kiểm tra thành viên nhóm hay đọc react/bài trong nhóm: "đã vào nhóm" là nhập mã ghim trong nhóm, "đã chia sẻ" là lượt bấm do Server đếm.
export type ShareKind = 'feed' | 'group';

export interface ShareCounts {
  feed: number;
  group: number;
}

export interface CommunityView {
  /** Ảnh Google/Facebook đã lưu về Server (đường dẫn tương đối /api/v1/me/avatar?v=...); null khi chưa có. */
  avatarUrl: string | null;
  /** 'google.com' | 'facebook.com'; null khi chưa có ảnh. */
  avatarProvider: string | null;
  /** Liên kết nhóm Facebook; null thì ẩn nút vào nhóm. */
  groupUrl: string | null;
  /** Địa chỉ trang web được chia sẻ; null thì ẩn nút chia sẻ. */
  shareUrl: string | null;
  /** Có bước xác nhận bằng mã không. */
  groupCodeEnabled: boolean;
  joinLinkClicked: boolean;
  groupVerified: boolean;
  shares: ShareCounts;
}
