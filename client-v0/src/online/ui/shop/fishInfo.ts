// Mô tả ngắn từng loài cho popup bán cá. Server chưa có mô tả nên tạm để ở Client
// (người dùng duyệt 2026-11-13); GD sửa câu chữ tại đây hoặc chuyển vào config sau.
const DESCRIPTIONS: Record<string, string> = {
  minnow: 'Cá nhỏ bơi thành đàn ven bờ, cắn câu liên tục.',
  perch: 'Cá rô sọc vằn, thích nấp quanh chân cọc cầu.',
  carp: 'Cá chép lì lợm, hay ăn mồi dưới đáy bùn.',
  trout: 'Cá hồi suối nhanh nhẹn, ưa nước mát và trong.',
  bass: 'Cá vược khỏe, giật cần rất mạnh khi mắc câu.',
  goldcarp: 'Cá chép vàng óng, người ta bảo bắt được là gặp may.',
  puffer: 'Cá nóc phình tròn khi bị kéo lên khỏi mặt nước.',
  koi: 'Cá koi hoa văn rực rỡ, hiếm khi rời vùng nước lặng.',
  moonfin: 'Loài cá huyền thoại, vây sáng như trăng rằm dưới nước.',
};

export function fishDescription(speciesId: string): string {
  return DESCRIPTIONS[speciesId] ?? '...';
}
