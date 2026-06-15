import { Role } from '@prisma/client';
import { prisma } from './prisma.js';
import type { AuthRequest } from '../middleware/auth.js';
import { getParentChildIds } from './parentAccess.js';

export async function getTeacherClassGroupIds(teacherId: string): Promise<string[]> {
  const rows = await prisma.teacherAssignment.findMany({
    where: { teacherId },
    select: { classGroupId: true },
  });
  return [...new Set(rows.map((r) => r.classGroupId))];
}

export async function assertTeacherClassAccess(
  teacherId: string,
  classGroupId: string
): Promise<void> {
  const ok = await prisma.teacherAssignment.findFirst({
    where: { teacherId, classGroupId },
  });
  if (!ok) {
    const err = new Error('Немає доступу до цього класу');
    (err as Error & { status: number }).status = 403;
    throw err;
  }
}

/** Перевірка призначення вчителя на пару клас + предмет. */
export async function assertTeacherAssignment(
  req: AuthRequest,
  classGroupId: string,
  subjectId: string
): Promise<void> {
  if (req.user!.role === Role.ADMIN) return;
  const ok = await prisma.teacherAssignment.findFirst({
    where: {
      teacherId: req.user!.userId,
      classGroupId,
      subjectId,
    },
  });
  if (!ok) {
    const err = new Error('Немає призначення на цей клас і предмет');
    (err as Error & { status: number }).status = 403;
    throw err;
  }
}

export async function assertHomeworkOwned(
  req: AuthRequest,
  homeworkId: string
): Promise<{ id: string; teacherId: string; classGroupId: string }> {
  const hw = await prisma.homework.findUnique({
    where: { id: homeworkId },
    select: { id: true, teacherId: true, classGroupId: true },
  });
  if (!hw) {
    const err = new Error('Завдання не знайдено');
    (err as Error & { status: number }).status = 404;
    throw err;
  }
  if (req.user!.role === Role.ADMIN) return hw;
  if (hw.teacherId !== req.user!.userId) {
    const err = new Error('Немає доступу до цього завдання');
    (err as Error & { status: number }).status = 403;
    throw err;
  }
  return hw;
}

export async function assertSubmissionOwned(req: AuthRequest, submissionId: string) {
  const sub = await prisma.homeworkSubmission.findUnique({
    where: { id: submissionId },
    include: { homework: { select: { id: true, teacherId: true } } },
  });
  if (!sub) {
    const err = new Error('Роботу не знайдено');
    (err as Error & { status: number }).status = 404;
    throw err;
  }
  await assertHomeworkOwned(req, sub.homework.id);
  return sub;
}

type HomeworkRef = { id: string; teacherId: string; classGroupId: string };

/** Перегляд/коментарі до ДЗ: вчитель, учень класу, батько дитини цього класу, адмін. */
export async function assertHomeworkViewAccess(
  req: AuthRequest,
  homeworkId: string
): Promise<HomeworkRef> {
  const hw = await prisma.homework.findUnique({
    where: { id: homeworkId },
    select: { id: true, teacherId: true, classGroupId: true },
  });
  if (!hw) {
    const err = new Error('Завдання не знайдено');
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  const role = req.user!.role;
  if (role === Role.ADMIN) return hw;

  if (role === Role.TEACHER) {
    if (hw.teacherId === req.user!.userId) return hw;
    await assertTeacherClassAccess(req.user!.userId, hw.classGroupId);
    return hw;
  }

  if (role === Role.STUDENT) {
    const student = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { classGroupId: true },
    });
    if (student?.classGroupId !== hw.classGroupId) {
      const err = new Error('Немає доступу до цього завдання');
      (err as Error & { status: number }).status = 403;
      throw err;
    }
    return hw;
  }

  if (role === Role.PARENT) {
    const childIds = await getParentChildIds(req.user!.userId);
    const match = await prisma.user.findFirst({
      where: { id: { in: childIds }, classGroupId: hw.classGroupId },
      select: { id: true },
    });
    if (!match) {
      const err = new Error('Немає доступу до цього завдання');
      (err as Error & { status: number }).status = 403;
      throw err;
    }
    return hw;
  }

  const err = new Error('Доступ заборонено');
  (err as Error & { status: number }).status = 403;
  throw err;
}

export async function assertMaterialAccessible(req: AuthRequest, materialId: string) {
  const m = await prisma.lessonMaterial.findUnique({
    where: { id: materialId },
    select: { id: true, classGroupId: true },
  });
  if (!m) {
    const err = new Error('Матеріал не знайдено');
    (err as Error & { status: number }).status = 404;
    throw err;
  }
  if (req.user!.role === Role.ADMIN) return m;
  await assertTeacherClassAccess(req.user!.userId, m.classGroupId);
  return m;
}
