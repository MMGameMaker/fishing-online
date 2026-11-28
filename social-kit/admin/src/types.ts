// Khớp CommunityStats của social-kit/server (CommunityService.StatsAsync).
export interface CommunityStats {
  players: number;
  googleAccounts: number;
  facebookAccounts: number;
  withAvatar: number;
  joinLinkClickers: number;
  groupVerified: number;
  shares: { feed: number; group: number };
  sharers: number;
  last7Days: { date: string; feed: number; group: number }[];
}
