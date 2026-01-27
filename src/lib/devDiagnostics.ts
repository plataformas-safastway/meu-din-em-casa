export type AuthDebugSnapshot = {
  ts: number;
  path: string;
  bootstrapStatus?: string;
  profileStatus?: string;
  isLoading?: boolean;
  isAuthTransition?: boolean;
  shouldRedirectToLogin?: boolean;
  hasSession?: boolean;
  hasUser?: boolean;
  role?: string | null;
} | null;

let authSnapshot: AuthDebugSnapshot = null;

export function setAuthDebugSnapshot(next: AuthDebugSnapshot) {
  authSnapshot = next;
}

export function getAuthDebugSnapshot() {
  return authSnapshot;
}
