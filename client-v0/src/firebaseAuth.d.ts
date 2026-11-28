export function googleIdToken(): Promise<string>;
export function facebookIdToken(): Promise<string>;
export function prepareFacebook(): Promise<void>;
export function currentProviderId(): Promise<string | null>;
export function currentIdToken(): Promise<string | null>;
export function currentDisplayName(): Promise<string | null>;
export function signOutGoogle(): Promise<void>;
