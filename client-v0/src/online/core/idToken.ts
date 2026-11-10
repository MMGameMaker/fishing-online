// Lấy Firebase ID token để đổi lấy access token của Server. Mock không cần Firebase.
export async function getFirebaseIdToken(
  isMock: boolean,
  interactive: boolean,
): Promise<string | null> {
  if (isMock) return 'mock';
  const { currentIdToken, googleIdToken } = await import('../../firebaseAuth.js');
  const existing = await currentIdToken();
  if (existing || !interactive) return existing;
  // Popup chỉ mở được trong thao tác bấm của người dùng.
  return googleIdToken();
}
