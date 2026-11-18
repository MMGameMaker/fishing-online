/** Tên hồ hiển thị theo mapId Server gửi; map chưa đặt tên thì giữ mapId. Dùng cho thẻ cá và Sổ tay cá. */
const LAKE_NAMES: Record<string, string> = { 'fishing-pier': 'Hồ Tây', 'lake-01': 'Hồ Tây' };

export const lakeDisplayName = (mapId: string | null | undefined): string =>
  mapId ? (LAKE_NAMES[mapId] ?? mapId) : '—';
