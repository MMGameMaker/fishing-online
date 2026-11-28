// Lấy Firebase ID token để đổi lấy access token của Server. Mock không cần Firebase.
export type LoginProvider = 'google' | 'facebook';

export async function getFirebaseIdToken(
  isMock: boolean,
  interactive: boolean,
  provider: LoginProvider = 'google',
): Promise<string | null> {
  if (isMock) return 'mock';
  const { currentIdToken, googleIdToken, facebookIdToken } = await import('../../firebaseAuth.js');
  const existing = await currentIdToken();
  if (existing || !interactive) return existing;
  // Popup chỉ mở được trong thao tác bấm của người dùng.
  return provider === 'facebook' ? facebookIdToken() : googleIdToken();
}
