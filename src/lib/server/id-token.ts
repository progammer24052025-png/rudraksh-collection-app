/**
 * Firebase ID-token verification over the public web API.
 *
 * Shared by every route that needs to know *who* is calling. The token is
 * verified by Google, so the uid that comes back is trustworthy — unlike a
 * `user_id` field in the request body, which is whatever the client typed.
 */

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";

export type Caller = { uid: string; email: string | null; name: string | null };

/** Reads a `Authorization: Bearer <token>` header. */
export function bearer(request: Request): string | null {
  const header = request.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

/** Verifies a Firebase ID token with the public web API key. */
export async function verifyIdToken(idToken: string): Promise<Caller | null> {
  if (!API_KEY || !idToken) return null;
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        cache: "no-store",
      },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as {
      users?: { localId?: string; email?: string; displayName?: string }[];
    };
    const user = data.users?.[0];
    if (!user?.localId) return null;
    return {
      uid: user.localId,
      email: user.email ?? null,
      name: user.displayName ?? null,
    };
  } catch {
    return null;
  }
}

/** The verified caller for a request, or null for a guest. */
export async function callerFrom(request: Request): Promise<Caller | null> {
  const idToken = bearer(request);
  return idToken ? verifyIdToken(idToken) : null;
}
