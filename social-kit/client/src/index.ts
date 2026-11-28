// SocialKit client: popup Cộng đồng và logic thuần. CSS: import './community.css'.
// firebaseAuth kéo theo thư viện firebase nên không export ở đây; import riêng khi cần (alias/firebaseAuth).
export { CommunityPopup } from './CommunityPopup';
export type { CommunityHost, CommunityHttp } from './CommunityPopup';
export { communityIconUrl } from './communityIcon';
export {
  SHARE_LABEL,
  facebookShareUrl,
  normalizeGroupCode,
  providerLabel,
  safeHttpsUrl,
  sharesTotal,
} from './communityModel';
export type { CommunityView, ShareCounts, ShareKind } from './types';
