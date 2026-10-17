import 'server-only';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

/**
 * C4-TRACE: Phase 1 — centralized admin guard reused by every privileged
 * server action and admin API. The session must exist, be non-expired, and
 * expose an "admin" role.
 */

export type AdminSession = {
  userId: string;
  role: 'admin' | 'customer';
};

export class AdminAuthError extends Error {
  readonly status: number;
  readonly reason: 'unauthenticated' | 'forbidden';
  constructor(reason: 'unauthenticated' | 'forbidden', status: number) {
    super(reason === 'unauthenticated' ? 'Debes iniciar sesión' : 'No tenés permisos de administrador');
    this.name = 'AdminAuthError';
    this.reason = reason;
    this.status = status;
  }
}

function normalizeRole(role: unknown): 'admin' | 'customer' {
  return role === 'admin' ? 'admin' : 'customer';
}

export async function getCurrentSession(): Promise<AdminSession | null> {
  const session = await auth();
  const user = session?.user as
    | { id?: string | number; role?: string }
    | undefined;
  if (!session || !user?.id) return null;
  const id = typeof user.id === 'string' ? user.id : String(user.id);
  return { userId: id, role: normalizeRole(user.role) };
}

/** Server actions: throws AdminAuthError on failure. */
export async function requireAdmin(): Promise<AdminSession> {
  const current = await getCurrentSession();
  if (!current) throw new AdminAuthError('unauthenticated', 401);
  if (current.role !== 'admin') throw new AdminAuthError('forbidden', 403);
  return current;
}

/** API routes: returns the session when authorized, otherwise a NextResponse. */
export async function assertAdminRequest(): Promise<
  | { ok: true; session: AdminSession }
  | { ok: false; response: NextResponse }
> {
  const current = await getCurrentSession();
  if (!current) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'unauthenticated' }, { status: 401 }),
    };
  }
  if (current.role !== 'admin') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'forbidden' }, { status: 403 }),
    };
  }
  return { ok: true, session: current };
}
