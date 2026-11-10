import { getApps, initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  TotpMultiFactorGenerator,
  getAuth,
  getMultiFactorResolver,
  signInWithPopup,
  signOut,
  type MultiFactorError,
  type UserCredential,
} from 'firebase/auth';

function config() {
  const env = import.meta.env;
  const apiKey = env.VITE_FIREBASE_API_KEY as string | undefined;
  const projectId = env.VITE_FIREBASE_PROJECT_ID as string | undefined;
  if (!apiKey || !projectId) throw new Error('Thiếu cấu hình Firebase: tạo admin/.env.local theo admin/.env.example.');
  return {
    apiKey,
    projectId,
    authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) ?? `${projectId}.firebaseapp.com`,
    appId: env.VITE_FIREBASE_APP_ID as string | undefined,
  };
}

function auth() {
  return getAuth(getApps()[0] ?? initializeApp(config()));
}

/**
 * Đăng nhập Google rồi trả Firebase ID token. Tài khoản có MFA TOTP thì hỏi mã qua <paramref name="askCode"/>.
 * Admin bắt buộc MFA nên token phải có claim second factor.
 */
export async function googleIdToken(askCode: () => Promise<string>): Promise<string> {
  const instance = auth();
  let credential: UserCredential;
  try {
    credential = await signInWithPopup(instance, new GoogleAuthProvider());
  } catch (error) {
    if ((error as { code?: string }).code !== 'auth/multi-factor-auth-required') throw error;
    const resolver = getMultiFactorResolver(instance, error as MultiFactorError);
    const hint = resolver.hints.find((item) => item.factorId === TotpMultiFactorGenerator.FACTOR_ID);
    if (!hint) throw new Error('Tài khoản cần MFA bằng ứng dụng xác thực (TOTP).');
    const assertion = TotpMultiFactorGenerator.assertionForSignIn(hint.uid, await askCode());
    credential = await resolver.resolveSignIn(assertion);
  }
  return credential.user.getIdToken();
}

export async function firebaseSignOut(): Promise<void> {
  await signOut(auth()).catch(() => undefined);
}
