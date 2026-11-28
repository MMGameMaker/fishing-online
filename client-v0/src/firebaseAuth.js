// Đăng nhập Google / Facebook của game: logic nằm trong SocialKit (social-kit/client/src/firebaseAuth.ts), đây chỉ nạp cấu hình từ .env.
import { createSocialAuth } from '@social-kit/firebaseAuth';

const auth = createSocialAuth(() => {
  const env = import.meta.env;
  return {
    apiKey: env.VITE_FIREBASE_API_KEY,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    appId: env.VITE_FIREBASE_APP_ID,
    facebookAppId: env.VITE_FACEBOOK_APP_ID,
  };
});

export const googleIdToken = () => auth.googleIdToken();
export const facebookIdToken = () => auth.facebookIdToken();
export const prepareFacebook = () => auth.prepareFacebook();
export const currentProviderId = () => auth.currentProviderId();
export const currentIdToken = () => auth.currentIdToken();
export const signOutGoogle = () => auth.signOut();
export const currentDisplayName = () => auth.currentDisplayName();
