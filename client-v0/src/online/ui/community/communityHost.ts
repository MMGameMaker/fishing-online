// Keo giua game va SocialKit client (social-kit/README.md): nối popup Cộng đồng với ApiClient, toast, hiệu ứng và khung UI của game.
import '@social-kit/community.css';
import { CommunityPopup } from '@social-kit';
import { UI_DESIGN_HEIGHT, UI_DESIGN_WIDTH } from '../../core/env';
import type { Services } from '../../core/services';
import { showError, showToast } from '../kit/components';
import { animateIn, animateOut } from '../kit/motion';

const CLOSE = encodeURI('/mini game/Button Close.png');

export { communityIconUrl } from '@social-kit';

export function createCommunityPopup(options: { root: HTMLElement; services: Services }): CommunityPopup {
  const { root, services } = options;
  return new CommunityPopup({
    root,
    http: services.api,
    toast: (message) => showToast(root, message),
    error: (error) => showError(root, error),
    animateIn,
    animateOut,
    designSize: { width: UI_DESIGN_WIDTH, height: UI_DESIGN_HEIGHT },
    closeIconUrl: CLOSE,
  });
}
