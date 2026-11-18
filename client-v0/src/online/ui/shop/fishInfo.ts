// Mô tả ngắn từng loài cho popup bán cá. Server chưa có mô tả nên tạm để ở Client
// (người dùng duyệt 2026-11-13); GD sửa câu chữ tại đây hoặc chuyển vào config sau.
const DESCRIPTIONS: Record<string, string> = {
  minnow: 'Cá cơm nhỏ bơi thành đàn ven bờ, cắn câu liên tục.',
  perch: 'Cá mòi bạc lấp lánh, hay đi theo đàn gần mặt nước.',
  carp: 'Cá rô phi dễ sống, vây cam, quanh hồ chỗ nào cũng gặp.',
  trout: 'Cá trắm to khỏe, hay ăn cỏ và rong ven bờ.',
  bass: 'Cá chép lì lợm, hay ăn mồi dưới đáy bùn.',
  goldcarp: 'Cá chuối vằn đen, săn mồi dữ, giật cần rất mạnh.',
  puffer: 'Cá thu thân tím bạc, bơi nhanh và khỏe.',
  koi: 'Cá koi hoa văn rực rỡ, hiếm khi rời vùng nước lặng.',
  moonfin: 'Mực đỏ cam nhiều xúc tu, hiếm ai câu được ở Hồ Tây.',
};

export function fishDescription(speciesId: string): string {
  return DESCRIPTIONS[speciesId] ?? '...';
}
