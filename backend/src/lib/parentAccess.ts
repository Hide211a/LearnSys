import { Role } from '@prisma/client';
import { prisma } from './prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

export async function getParentChildIds(parentId: string): Promise<string[]> {
  const links = await prisma.parentLink.findMany({
    where: { parentId },
    select: { childId: true },
  });
  return links.map((l) => l.childId);
}

export async function getParentClassGroupIds(parentId: string): Promise<string[]> {
  const links = await prisma.parentLink.findMany({
    where: { parentId },
    include: { child: { select: { classGroupId: true } } },
  });
  const ids = links
    .map((l) => l.child.classGroupId)
    .filter((id): id is string => !!id);
  return [...new Set(ids)];
}

export async function assertParentChild(parentId: string, childId: string): Promise<void> {
  const link = await prisma.parentLink.findUnique({
    where: { parentId_childId: { parentId, childId } },
  });
  if (!link) {
    const err = new Error('Немає доступу до даних цього учня');
    (err as Error & { status: number }).status = 403;
    throw err;
  }
}

/** Resolve student id for STUDENT/PARENT routes; throws on invalid parent access. */
export async function resolveStudentId(req: AuthRequest): Promise<string | null> {
  if (req.user!.role === Role.STUDENT) return req.user!.userId;
  if (req.user!.role === Role.PARENT) {
    const childId = req.query.childId ? String(req.query.childId) : '';
    if (!childId) return null;
    await assertParentChild(req.user!.userId, childId);
    return childId;
  }
  return null;
}

export function sendResolveError(res: import('express').Response, err: unknown) {
  const status = (err as Error & { status?: number }).status ?? 500;
  const message = err instanceof Error ? err.message : 'Помилка доступу';
  res.status(status).json({ error: message });
}
