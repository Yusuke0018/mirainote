import { NextRequest } from "next/server";
import { getAdminAuth } from "./firebaseAdmin";

export type AuthContext = {
  uid: string;
};

export class UnauthorizedError extends Error {
  status = 401 as const;
}

export async function requireAuth(req: NextRequest): Promise<AuthContext> {
  // Debug bypass for local/testing
  if (process.env.AUTH_DEBUG_ENABLED === "1") {
    const debugUid =
      req.headers.get("x-debug-user") || process.env.AUTH_DEBUG_UID;
    if (debugUid) return { uid: debugUid };
  }

  const authz =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authz) {
    throw new UnauthorizedError("Missing Bearer token");
  }
  // Authorization scheme is case-insensitive per RFC 7235
  const m = authz.match(/^Bearer\s+(.+)$/i);
  if (!m) {
    throw new UnauthorizedError("Missing Bearer token");
  }
  const token = m[1].trim();
  const decoded = await getAdminAuth().verifyIdToken(token);
  return { uid: decoded.uid };
}
