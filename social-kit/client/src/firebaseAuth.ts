// Đăng nhập Google / Facebook qua Firebase Auth (popup), trả Firebase ID token để Server (SocialKit.Auth) xác minh.
// Facebook chỉ xin public_profile nên không cần App Review; phải bật nhà cung cấp Facebook trong Firebase Console (social-kit/README.md).
import { getApps, initializeApp } from 'firebase/app';
import {
  FacebookAuthProvider,
  GoogleAuthProvider,
  getAuth,
  signInWithCredential,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

export interface FirebaseWebConfig {
  apiKey?: string;
  projectId?: string;
  authDomain?: string;
  appId?: string;
  /**
   * Meta App ID (không phải secret). Có thì đăng nhập Facebook đi qua Facebook JavaScript SDK với đúng scope public_profile.
   * Không có thì dùng popup của Firebase, mà popup đó luôn xin thêm quyền `email` nên Meta app phải được thêm quyền email.
   */
  facebookAppId?: string;
}

interface FacebookLoginResponse {
  status: string;
  authResponse?: { accessToken: string } | null;
}

interface FacebookSdk {
  init(options: { appId: string; version: string; cookie: boolean; xfbml: boolean }): void;
  login(callback: (response: FacebookLoginResponse) => void, options: { scope: string }): void;
}

declare global {
  interface Window {
    FB?: FacebookSdk;
    fbAsyncInit?: () => void;
  }
}

const FACEBOOK_SDK_VERSION = 'v21.0';
let facebookSdk: Promise<FacebookSdk> | null = null;

/** Nạp Facebook JavaScript SDK một lần. Phải gọi trước khi người dùng bấm nút, vì FB.login phải chạy ngay trong thao tác bấm. */
function loadFacebookSdk(appId: string): Promise<FacebookSdk> {
  facebookSdk ??= new Promise<FacebookSdk>((resolve, reject) => {
    const ready = () => {
      const fb = window.FB;
      if (!fb) return reject(new Error('Không nạp được Facebook SDK'));
      fb.init({ appId, version: FACEBOOK_SDK_VERSION, cookie: false, xfbml: false });
      resolve(fb);
    };
    window.fbAsyncInit = ready;
    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/vi_VN/sdk.js';
    script.async = true;
    script.onerror = () => {
      facebookSdk = null;
      reject(new Error('Không nạp được Facebook SDK'));
    };
    document.head.append(script);
  });
  return facebookSdk;
}

export interface SocialAuth {
  googleIdToken(): Promise<string>;
  facebookIdToken(): Promise<string>;
  /** Nạp trước Facebook SDK (gọi khi hiện màn đăng nhập). Lỗi thì bỏ qua: facebookIdToken sẽ thử lại hoặc báo lỗi. */
  prepareFacebook(): Promise<void>;
  /** 'google.com' | 'facebook.com', hoặc null khi chưa đăng nhập. */
  currentProviderId(): Promise<string | null>;
  /** ID token mới cho người đang đăng nhập, hoặc null. */
  currentIdToken(): Promise<string | null>;
  currentDisplayName(): Promise<string | null>;
  signOut(): Promise<void>;
}

/** `getConfig` được gọi lười (lần dùng đầu) nên host có thể đọc biến môi trường lúc đó. */
export function createSocialAuth(getConfig: () => FirebaseWebConfig): SocialAuth {
  const auth = () => {
    const existing = getApps()[0];
    if (existing) return getAuth(existing);
    const config = getConfig();
    if (!config.apiKey || !config.projectId) throw new Error('Thiếu cấu hình Firebase (apiKey, projectId).');
    return getAuth(
      initializeApp({
        apiKey: config.apiKey,
        projectId: config.projectId,
        authDomain: config.authDomain ?? `${config.projectId}.firebaseapp.com`,
        appId: config.appId,
      }),
    );
  };
  const ready = async () => {
    const instance = auth();
    await instance.authStateReady();
    return instance;
  };
  return {
    async googleIdToken() {
      const credential = await signInWithPopup(auth(), new GoogleAuthProvider());
      return credential.user.getIdToken();
    },
    async prepareFacebook() {
      const appId = getConfig().facebookAppId;
      if (appId) await loadFacebookSdk(appId);
    },
    async facebookIdToken() {
      const appId = getConfig().facebookAppId;
      if (appId) {
        // Facebook SDK chỉ xin public_profile (tên và ảnh), rồi đổi access token lấy phiên Firebase. Server không dùng email.
        const fb = await loadFacebookSdk(appId);
        const accessToken = await new Promise<string>((resolve, reject) => {
          fb.login(
            (response) => {
              const token = response.authResponse?.accessToken;
              if (response.status === 'connected' && token) resolve(token);
              else reject(Object.assign(new Error('Đã huỷ đăng nhập Facebook'), { code: 'auth/popup-closed-by-user' }));
            },
            { scope: 'public_profile' },
          );
        });
        const credential = await signInWithCredential(auth(), FacebookAuthProvider.credential(accessToken));
        return credential.user.getIdToken();
      }
      // Không có Meta App ID: popup của Firebase (luôn kèm quyền email).
      const provider = new FacebookAuthProvider();
      provider.addScope('public_profile');
      const credential = await signInWithPopup(auth(), provider);
      return credential.user.getIdToken();
    },
    async currentProviderId() {
      return (await ready()).currentUser?.providerData?.[0]?.providerId ?? null;
    },
    async currentIdToken() {
      const user = (await ready()).currentUser;
      return user ? user.getIdToken() : null;
    },
    async currentDisplayName() {
      return (await ready()).currentUser?.displayName ?? null;
    },
    async signOut() {
      await signOut(auth());
    },
  };
}
