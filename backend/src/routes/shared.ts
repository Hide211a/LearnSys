import { Router } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { paramId } from '../lib/params.js';
import {
  assertParentChild,
  getParentClassGroupIds,
  getParentChildIds,
  sendResolveError,
} from '../lib/parentAccess.js';
import { assertHomeworkViewAccess, getTeacherClassGroupIds } from '../lib/teacherAccess.js';

const router = Router();
router.use(authenticate);

async function classFilterForUser(req: AuthRequest) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) return { isGlobal: true } as const;

  if (user.role === Role.PARENT) {
    const childId = req.query.childId ? String(req.query.childId) : '';
    let classIds: string[];
    if (childId) {
      await assertParentChild(user.id, childId);
      const child = await prisma.user.findUnique({
        where: { id: childId },
        select: { classGroupId: true },
      });
      classIds = child?.classGroupId ? [child.classGroupId] : [];
    } else {
      classIds = await getParentClassGroupIds(user.id);
    }
    return {
      OR: [{ isGlobal: true }, ...(classIds.length ? [{ classGroupId: { in: classIds } }] : [])],
    };
  }

  return {
    OR: [{ isGlobal: true }, ...(user.classGroupId ? [{ classGroupId: user.classGroupId }] : [])],
  };
}

router.get('/announcements', async (req: AuthRequest, res) => {
  try {
    const where = await classFilterForUser(req);
    const list = await prisma.announcement.findMany({
      where,
      include: { author: { select: { firstName: true, lastName: true } }, classGroup: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (e) {
    sendResolveError(res, e);
  }
});

router.post('/announcements', async (req: AuthRequest, res) => {
  const role = req.user!.role;
  if (role !== Role.ADMIN && role !== Role.TEACHER) {
    res.status(403).json({ error: 'Доступ заборонено' });
    return;
  }
  const { title, content, classGroupId, isGlobal } = req.body;
  const ann = await prisma.announcement.create({
    data: {
      title,
      content,
      classGroupId: isGlobal ? null : classGroupId,
      isGlobal: !!isGlobal,
      authorId: req.user!.userId,
    },
  });

  const users = await prisma.user.findMany({
    where: isGlobal
      ? { role: { in: [Role.STUDENT, Role.TEACHER, Role.PARENT] } }
      : { classGroupId },
  });
  const parentIds = classGroupId
    ? (
        await prisma.parentLink.findMany({
          where: { child: { classGroupId } },
          select: { parentId: true },
        })
      ).map((l) => l.parentId)
    : [];
  const notifyIds = new Set([...users.map((u) => u.id), ...parentIds]);
  await Promise.all(
    [...notifyIds].map((userId) =>
      prisma.notification.create({
        data: { userId, title: 'Нове оголошення', message: title, link: '/announcements' },
      })
    )
  );

  res.status(201).json(ann);
});

router.get('/notifications', async (req: AuthRequest, res) => {
  res.json(
    await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  );
});

router.patch('/notifications/:id/read', async (req: AuthRequest, res) => {
  await prisma.notification.updateMany({
    where: { id: paramId(req.params.id), userId: req.user!.userId },
    data: { isRead: true },
  });
  res.json({ ok: true });
});

router.post('/notifications/read-all', async (req: AuthRequest, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId },
    data: { isRead: true },
  });
  res.json({ ok: true });
});

router.get('/events', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) {
      res.json([]);
      return;
    }

    let classIds: (string | null)[] = [null];
    if (user.role === Role.PARENT) {
      const childId = req.query.childId ? String(req.query.childId) : '';
      if (childId) {
        await assertParentChild(user.id, childId);
        const child = await prisma.user.findUnique({
          where: { id: childId },
          select: { classGroupId: true },
        });
        classIds = [null, ...(child?.classGroupId ? [child.classGroupId] : [])];
      } else {
        const ids = await getParentClassGroupIds(user.id);
        classIds = [null, ...ids];
      }
    } else if (user.classGroupId) {
      classIds = [null, user.classGroupId];
    }

    res.json(
      await prisma.event.findMany({
        where: { OR: classIds.map((id) => ({ classGroupId: id })) },
        include: { classGroup: { select: { id: true, name: true } } },
        orderBy: { startDate: 'asc' },
      })
    );
  } catch (e) {
    sendResolveError(res, e);
  }
});

router.get('/polls', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) {
      res.json([]);
      return;
    }

    let where: { classGroupId?: string | { in: string[] } } = {};
    if (user.role === Role.STUDENT) {
      if (!user.classGroupId) {
        res.json([]);
        return;
      }
      where = { classGroupId: user.classGroupId };
    } else if (user.role === Role.TEACHER) {
      const classIds = await getTeacherClassGroupIds(user.id);
      if (!classIds.length) {
        res.json([]);
        return;
      }
      const filter = req.query.classGroupId ? String(req.query.classGroupId) : null;
      if (filter && !classIds.includes(filter)) {
        res.status(403).json({ error: 'Немає доступу до цього класу' });
        return;
      }
      where = { classGroupId: filter ?? { in: classIds } };
    } else if (user.role === Role.PARENT) {
      const classIds = await getParentClassGroupIds(user.id);
      if (!classIds.length) {
        res.json([]);
        return;
      }
      where = { classGroupId: { in: classIds } };
    } else if (req.query.classGroupId) {
      where = { classGroupId: String(req.query.classGroupId) };
    }

    res.json(
      await prisma.poll.findMany({
        where,
        include: { options: { include: { _count: { select: { votes: true } } } } },
        orderBy: { createdAt: 'desc' },
      })
    );
  } catch (e) {
    sendResolveError(res, e);
  }
});

router.post('/polls', async (req: AuthRequest, res) => {
  if (req.user!.role !== Role.TEACHER && req.user!.role !== Role.ADMIN) {
    res.status(403).json({ error: 'Доступ заборонено' });
    return;
  }
  const { question, classGroupId, allowMultiple, options } = req.body;
  const poll = await prisma.poll.create({
    data: {
      question,
      classGroupId,
      authorId: req.user!.userId,
      allowMultiple,
      options: { create: options.map((text: string) => ({ text })) },
    },
    include: { options: true },
  });
  res.status(201).json(poll);
});

router.post('/polls/:pollId/vote', async (req: AuthRequest, res) => {
  if (req.user!.role !== Role.STUDENT) {
    res.status(403).json({ error: 'Голосувати можуть лише учні' });
    return;
  }
  const student = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!student?.classGroupId) {
    res.status(400).json({ error: 'Учень не зарахований до класу' });
    return;
  }
  const pollId = paramId(req.params.pollId);
  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
  if (!poll || poll.classGroupId !== student.classGroupId) {
    res.status(403).json({ error: 'Опитування недоступне' });
    return;
  }
  const { optionIds } = req.body as { optionIds: string[] };
  for (const optionId of optionIds) {
    const opt = await prisma.pollOption.findFirst({
      where: { id: optionId, pollId },
    });
    if (!opt) {
      res.status(400).json({ error: 'Невірний варіант відповіді' });
      return;
    }
    await prisma.pollVote.upsert({
      where: { optionId_userId: { optionId, userId: req.user!.userId } },
      create: { optionId, userId: req.user!.userId },
      update: {},
    });
  }
  res.json({ ok: true });
});

router.get('/homework/:id/comments', async (req: AuthRequest, res) => {
  try {
    const homeworkId = paramId(req.params.id);
    await assertHomeworkViewAccess(req, homeworkId);
    res.json(
      await prisma.homeworkComment.findMany({
        where: { homeworkId },
        orderBy: { createdAt: 'asc' },
      })
    );
  } catch (e) {
    sendResolveError(res, e);
  }
});

router.post('/homework/:id/comments', async (req: AuthRequest, res) => {
  try {
    const homeworkId = paramId(req.params.id);
    await assertHomeworkViewAccess(req, homeworkId);
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) {
      res.status(404).json({ error: 'Користувача не знайдено' });
      return;
    }
    const text = String(req.body.text ?? '').trim();
    if (!text) {
      res.status(400).json({ error: 'Текст коментаря обов’язковий' });
      return;
    }
    const comment = await prisma.homeworkComment.create({
      data: {
        homeworkId,
        authorId: req.user!.userId,
        authorName: `${user.lastName} ${user.firstName}`,
        text,
      },
    });
    res.status(201).json(comment);
  } catch (e) {
    sendResolveError(res, e);
  }
});

router.get('/search', async (req: AuthRequest, res) => {
  const q = String(req.query.q ?? '').trim();
  if (!q) {
    res.json({ users: [], subjects: [], homework: [] });
    return;
  }

  const role = req.user!.role;
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });

  const subjects = await prisma.subject.findMany({
    where: { OR: [{ name: { contains: q } }, { code: { contains: q } }] },
    take: 10,
  });

  let users: {
    id: string;
    firstName: string;
    lastName: string;
    role: Role;
    email?: string;
  }[] = [];
  let homework: Awaited<ReturnType<typeof prisma.homework.findMany>> = [];

  if (role === Role.ADMIN || role === Role.TEACHER) {
    const teacherClassIds = role === Role.TEACHER ? await getTeacherClassGroupIds(req.user!.userId) : [];
    const userWhere =
      role === Role.TEACHER
        ? {
            role: Role.STUDENT,
            OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }],
            classGroupId: { in: teacherClassIds.length ? teacherClassIds : ['__none__'] },
          }
        : {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { email: { contains: q } },
            ],
          };

    users = await prisma.user.findMany({
      where: userWhere,
      take: 10,
      select: { id: true, firstName: true, lastName: true, role: true, email: true },
    });

    const hwWhere =
      role === Role.TEACHER
        ? { title: { contains: q }, teacherId: req.user!.userId }
        : { title: { contains: q } };

    homework = await prisma.homework.findMany({
      where: hwWhere,
      take: 10,
      include: { subject: true },
    });
  } else if (role === Role.STUDENT && user?.classGroupId) {
    homework = await prisma.homework.findMany({
      where: { title: { contains: q }, classGroupId: user.classGroupId },
      take: 10,
      include: { subject: true },
    });
  } else if (role === Role.PARENT) {
    const childIds = await getParentChildIds(req.user!.userId);
    const classIds = await getParentClassGroupIds(req.user!.userId);
    users = await prisma.user.findMany({
      where: {
        id: { in: childIds },
        OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }],
      },
      take: 10,
      select: { id: true, firstName: true, lastName: true, role: true },
    });
    if (classIds.length) {
      homework = await prisma.homework.findMany({
        where: { title: { contains: q }, classGroupId: { in: classIds } },
        take: 10,
        include: { subject: true },
      });
    }
  }

  res.json({ users, subjects, homework });
});

export default router;
