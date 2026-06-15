import { Router } from 'express';
import { Role, Attendance } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRoles, type AuthRequest } from '../middleware/auth.js';
import { paramId } from '../lib/params.js';
import { sendResolveError } from '../lib/parentAccess.js';
import {
  assertHomeworkOwned,
  assertSubmissionOwned,
  assertMaterialAccessible,
  assertTeacherAssignment,
  assertTeacherClassAccess,
  getTeacherClassGroupIds,
} from '../lib/teacherAccess.js';
import { notifyParentsOfStudents } from '../lib/notifyParents.js';

const router = Router();
router.use(authenticate, requireRoles(Role.TEACHER, Role.ADMIN));

function todayDayOfWeek(): number {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

router.get('/dashboard', async (req: AuthRequest, res) => {
  const teacherId = req.user!.userId;
  const user = await prisma.user.findUnique({
    where: { id: teacherId },
    select: { firstName: true, lastName: true, patronymic: true },
  });

  const assignments = await prisma.teacherAssignment.findMany({
    where: { teacherId },
    include: { subject: true, classGroup: true },
  });

  const uniqueStudents = new Set<string>();
  let submissionsToReview = 0;
  let overdueHomework = 0;

  for (const a of assignments) {
    const students = await prisma.user.findMany({
      where: { classGroupId: a.classGroupId, role: Role.STUDENT },
      select: { id: true },
    });
    students.forEach((s) => uniqueStudents.add(s.id));
    submissionsToReview += await prisma.homeworkSubmission.count({
      where: {
        status: 'SUBMITTED',
        homework: { classGroupId: a.classGroupId, subjectId: a.subjectId, teacherId },
      },
    });
    overdueHomework += await prisma.homeworkSubmission.count({
      where: {
        status: 'NOT_SUBMITTED',
        homework: {
          classGroupId: a.classGroupId,
          subjectId: a.subjectId,
          teacherId,
          dueDate: { lt: new Date() },
        },
      },
    });
  }

  const dow = todayDayOfWeek();
  const scheduleToday =
    dow <= 5
      ? await prisma.scheduleSlot.findMany({
          where: { teacherId, dayOfWeek: dow },
          include: { subject: true, classGroup: true },
          orderBy: { lessonNumber: 'asc' },
        })
      : [];

  const now = new Date();
  const inWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const upcomingHomework = await prisma.homework.findMany({
    where: { teacherId, dueDate: { gte: now, lte: inWeek } },
    include: { subject: true, classGroup: true },
    orderBy: { dueDate: 'asc' },
    take: 8,
  });

  const tasks: { type: string; title: string; count: number; path: string }[] = [];
  if (submissionsToReview > 0) {
    tasks.push({
      type: 'review',
      title: 'Перевірити здані домашні завдання',
      count: submissionsToReview,
      path: '/teacher/homework',
    });
  }
  if (overdueHomework > 0) {
    tasks.push({
      type: 'overdue',
      title: 'Учні з простроченими ДЗ',
      count: overdueHomework,
      path: '/teacher/homework',
    });
  }

  const classPreviews = await Promise.all(
    assignments.slice(0, 8).map(async (a) => {
      const records = await prisma.lessonRecord.findMany({
        where: { classGroupId: a.classGroupId, subjectId: a.subjectId, grade: { not: null } },
        select: { grade: true },
      });
      const avg = records.length
        ? Math.round((records.reduce((s, r) => s + (r.grade ?? 0), 0) / records.length) * 10) / 10
        : null;
      return {
        assignmentId: a.id,
        classGroupId: a.classGroupId,
        subjectId: a.subjectId,
        className: a.classGroup.name,
        subjectName: a.subject.name,
        averageGrade: avg,
      };
    })
  );

  res.json({
    user,
    summary: {
      assignmentCount: assignments.length,
      studentCount: uniqueStudents.size,
      submissionsToReview,
      overdueHomework,
      lessonsToday: scheduleToday.length,
    },
    scheduleToday: scheduleToday.map((s) => ({
      id: s.id,
      lessonNumber: s.lessonNumber,
      room: s.room,
      subjectName: s.subject.name,
      className: s.classGroup.name,
      classGroupId: s.classGroupId,
      subjectId: s.subjectId,
    })),
    tasks,
    upcomingHomework,
    classPreviews,
  });
});

router.get('/schedule', async (req: AuthRequest, res) => {
  const teacherId = req.user!.userId;
  res.json(
    await prisma.scheduleSlot.findMany({
      where: { teacherId },
      include: {
        subject: true,
        classGroup: { select: { id: true, name: true, grade: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { lessonNumber: 'asc' }],
    })
  );
});

router.get('/my-classes', async (req: AuthRequest, res) => {
  const teacherId = req.user!.role === Role.ADMIN && req.query.teacherId
    ? String(req.query.teacherId)
    : req.user!.userId;
  const assignments = await prisma.teacherAssignment.findMany({
    where: { teacherId },
    include: { subject: true, classGroup: true },
    orderBy: [{ classGroup: { grade: 'asc' } }],
  });

  const enriched = await Promise.all(
    assignments.map(async (a) => {
      const students = await prisma.user.findMany({
        where: { classGroupId: a.classGroupId, role: Role.STUDENT },
        select: { id: true, firstName: true, lastName: true, patronymic: true, email: true },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });

      const records = await prisma.lessonRecord.findMany({
        where: { classGroupId: a.classGroupId, subjectId: a.subjectId },
        orderBy: { date: 'desc' },
      });

      const grades = records.filter((r) => r.grade != null).map((r) => r.grade!);
      const averageGrade = grades.length
        ? Math.round((grades.reduce((s, g) => s + g, 0) / grades.length) * 10) / 10
        : null;

      const absentLessons = records.filter((r) => r.attendance === 'ABSENT').length;
      const latestByStudent = new Map<string, (typeof records)[0]>();
      for (const r of records) {
        if (!latestByStudent.has(r.studentId)) latestByStudent.set(r.studentId, r);
      }

      const studentsWithStats = students.map((s) => {
        const last = latestByStudent.get(s.id);
        return {
          ...s,
          lastGrade: last?.grade ?? null,
          lastAttendance: last?.attendance ?? null,
          lastTopic: last?.topic ?? null,
        };
      });

      const submissionsToReview = await prisma.homeworkSubmission.count({
        where: {
          status: 'SUBMITTED',
          homework: { classGroupId: a.classGroupId, subjectId: a.subjectId, teacherId },
        },
      });

      const overdueHomework = await prisma.homeworkSubmission.count({
        where: {
          status: 'NOT_SUBMITTED',
          homework: {
            classGroupId: a.classGroupId,
            subjectId: a.subjectId,
            teacherId,
            dueDate: { lt: new Date() },
          },
        },
      });

      const activeHomework = await prisma.homework.findMany({
        where: { classGroupId: a.classGroupId, subjectId: a.subjectId, teacherId },
        orderBy: { dueDate: 'asc' },
        take: 3,
        select: { id: true, title: true, dueDate: true },
      });

      const lessonsPerWeek = await prisma.scheduleSlot.count({
        where: { classGroupId: a.classGroupId, subjectId: a.subjectId, teacherId },
      });

      const scheduleToday = await prisma.scheduleSlot.findMany({
        where: {
          classGroupId: a.classGroupId,
          subjectId: a.subjectId,
          teacherId,
          dayOfWeek: todayDayOfWeek() <= 5 ? todayDayOfWeek() : -1,
        },
        orderBy: { lessonNumber: 'asc' },
        select: { lessonNumber: true, room: true },
      });

      return {
        ...a,
        classGroup: { ...a.classGroup, studentCount: students.length },
        students: studentsWithStats,
        stats: {
          averageGrade,
          absentLessons,
          submissionsToReview,
          overdueHomework,
          lessonsPerWeek,
          studentCount: students.length,
        },
        activeHomework,
        scheduleToday,
      };
    })
  );

  res.json(enriched);
});

router.get('/journal', async (req: AuthRequest, res) => {
  try {
  const { classGroupId, subjectId, from, to } = req.query;
  if (!classGroupId || !subjectId) {
    res.status(400).json({ error: 'Потрібні classGroupId та subjectId' });
    return;
  }
  await assertTeacherAssignment(req, String(classGroupId), String(subjectId));
  const students = await prisma.user.findMany({
    where: { classGroupId: String(classGroupId), role: Role.STUDENT },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });
  const records = await prisma.lessonRecord.findMany({
    where: {
      classGroupId: String(classGroupId),
      subjectId: String(subjectId),
      ...(from && to
        ? { date: { gte: new Date(String(from)), lte: new Date(String(to)) } }
        : {}),
    },
    orderBy: { date: 'asc' },
  });
  res.json({ students, records });
  } catch (e) {
    sendResolveError(res, e);
  }
});

router.post('/journal', async (req: AuthRequest, res) => {
  try {
  const { date, classGroupId, subjectId, studentId, grade, topic, homeworkNote, attendance } = req.body;
  await assertTeacherAssignment(req, classGroupId, subjectId);
  const record = await prisma.lessonRecord.upsert({
    where: {
      date_subjectId_studentId: {
        date: new Date(date),
        subjectId,
        studentId,
      },
    },
    create: {
      date: new Date(date),
      classGroupId,
      subjectId,
      studentId,
      grade: grade ?? null,
      topic: topic ?? null,
      homeworkNote: homeworkNote ?? null,
      attendance: attendance ?? 'PRESENT',
    },
    update: { grade, topic, homeworkNote, attendance },
  });

  await prisma.notification.create({
    data: {
      userId: studentId,
      title: grade ? 'Нова оцінка' : 'Оновлення журналу',
      message: grade ? `Вам виставлено оцінку: ${grade}` : 'Запис у журналі оновлено',
      link: '/student/grades',
    },
  });

  res.json(record);
  } catch (e) {
    sendResolveError(res, e);
  }
});

router.post('/journal/bulk', async (req: AuthRequest, res) => {
  try {
  const { entries } = req.body as {
    entries: {
      date: string;
      classGroupId: string;
      subjectId: string;
      studentId: string;
      grade?: number | null;
      topic?: string | null;
      homeworkNote?: string | null;
      attendance?: string;
    }[];
  };

  if (!Array.isArray(entries) || entries.length === 0) {
    res.status(400).json({ error: 'Немає записів для збереження' });
    return;
  }

  const first = entries[0];
  await assertTeacherAssignment(req, first.classGroupId, first.subjectId);
  for (const entry of entries) {
    if (entry.classGroupId !== first.classGroupId || entry.subjectId !== first.subjectId) {
      res.status(400).json({ error: 'Усі записи мають бути одного класу та предмета' });
      return;
    }
  }

  const results = await prisma.$transaction(
    entries.map((entry) =>
      prisma.lessonRecord.upsert({
        where: {
          date_subjectId_studentId: {
            date: new Date(entry.date),
            subjectId: entry.subjectId,
            studentId: entry.studentId,
          },
        },
        create: {
          date: new Date(entry.date),
          classGroupId: entry.classGroupId,
          subjectId: entry.subjectId,
          studentId: entry.studentId,
          grade: entry.grade ?? null,
          topic: entry.topic ?? null,
          homeworkNote: entry.homeworkNote ?? null,
          attendance: (entry.attendance as Attendance) ?? Attendance.PRESENT,
        },
        update: {
          grade: entry.grade ?? null,
          topic: entry.topic ?? null,
          homeworkNote: entry.homeworkNote ?? null,
          attendance: (entry.attendance as Attendance) ?? Attendance.PRESENT,
        },
      })
    )
  );

  await Promise.all(
    entries.map((entry) =>
      prisma.notification.create({
        data: {
          userId: entry.studentId,
          title: entry.grade ? 'Нова оцінка' : 'Оновлення журналу',
          message: entry.grade ? `Вам виставлено оцінку: ${entry.grade}` : 'Запис у журналі оновлено',
          link: '/student/grades',
        },
      })
    )
  );

  res.json({ saved: results.length });
  } catch (e) {
    sendResolveError(res, e);
  }
});

router.get('/homework', async (req: AuthRequest, res) => {
  const teacherId = req.user!.userId;
  const list = await prisma.homework.findMany({
    where: { teacherId },
    include: {
      subject: true,
      classGroup: true,
      _count: { select: { submissions: true } },
    },
    orderBy: { dueDate: 'desc' },
  });
  const enriched = await Promise.all(
    list.map(async (hw) => ({
      ...hw,
      pendingReview: await prisma.homeworkSubmission.count({
        where: { homeworkId: hw.id, status: 'SUBMITTED' },
      }),
    }))
  );
  res.json(enriched);
});

router.post('/homework', async (req: AuthRequest, res) => {
  try {
  const { title, description, dueDate, classGroupId, subjectId } = req.body;
  await assertTeacherAssignment(req, classGroupId, subjectId);
  const hw = await prisma.homework.create({
    data: {
      title,
      description,
      dueDate: new Date(dueDate),
      classGroupId,
      subjectId,
      teacherId: req.user!.userId,
    },
    include: { subject: true, classGroup: true },
  });

  const students = await prisma.user.findMany({
    where: { classGroupId, role: Role.STUDENT },
  });
  await Promise.all(
    students.map((s) =>
      prisma.homeworkSubmission.upsert({
        where: { homeworkId_studentId: { homeworkId: hw.id, studentId: s.id } },
        create: { homeworkId: hw.id, studentId: s.id, status: 'NOT_SUBMITTED' },
        update: {},
      })
    )
  );
  await Promise.all(
    students.map((s) =>
      prisma.notification.create({
        data: {
          userId: s.id,
          title: 'Нове домашнє завдання',
          message: title,
          link: '/student/homework',
        },
      })
    )
  );
  await notifyParentsOfStudents(
    students.map((s) => s.id),
    { title: 'Нове домашнє завдання', message: title, linkPath: 'homework' }
  );

  res.status(201).json(hw);
  } catch (e) {
    sendResolveError(res, e);
  }
});

router.get('/homework/:id/submissions', async (req: AuthRequest, res) => {
  try {
    const homeworkId = paramId(req.params.id);
    await assertHomeworkOwned(req, homeworkId);
    const subs = await prisma.homeworkSubmission.findMany({
      where: { homeworkId },
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
    });
    res.json(subs);
  } catch (e) {
    sendResolveError(res, e);
  }
});

router.patch('/submissions/:id', async (req: AuthRequest, res) => {
  try {
    const submissionId = paramId(req.params.id);
    await assertSubmissionOwned(req, submissionId);
    const { status, grade, feedback } = req.body;
    const sub = await prisma.homeworkSubmission.update({
      where: { id: submissionId },
      data: { status, grade, feedback },
      include: { student: true },
    });
    if (sub.studentId) {
      const msg = feedback ?? `Статус: ${status}`;
      await prisma.notification.create({
        data: {
          userId: sub.studentId,
          title: 'Перевірено домашнє завдання',
          message: msg,
          link: '/student/homework',
        },
      });
      await notifyParentsOfStudents([sub.studentId], {
        title: 'Перевірено домашнє завдання дитини',
        message: msg,
        linkPath: 'homework',
      });
    }
    res.json(sub);
  } catch (e) {
    sendResolveError(res, e);
  }
});

router.get('/materials', async (req: AuthRequest, res) => {
  try {
    const teacherId = req.user!.userId;
    if (req.user!.role === Role.ADMIN) {
      res.json(
        await prisma.lessonMaterial.findMany({
          where: req.query.classGroupId ? { classGroupId: String(req.query.classGroupId) } : {},
          include: { subject: true },
          orderBy: { lessonDate: 'desc' },
        })
      );
      return;
    }
    const classIds = await getTeacherClassGroupIds(teacherId);
    if (!classIds.length) {
      res.json([]);
      return;
    }
    const filterId = req.query.classGroupId ? String(req.query.classGroupId) : null;
    if (filterId && !classIds.includes(filterId)) {
      res.status(403).json({ error: 'Немає доступу до цього класу' });
      return;
    }
    res.json(
      await prisma.lessonMaterial.findMany({
        where: { classGroupId: filterId ?? { in: classIds } },
        include: { subject: true },
        orderBy: { lessonDate: 'desc' },
      })
    );
  } catch (e) {
    sendResolveError(res, e);
  }
});

router.post('/materials', async (req: AuthRequest, res) => {
  try {
    const { classGroupId } = req.body;
    if (req.user!.role !== Role.ADMIN) {
      await assertTeacherClassAccess(req.user!.userId, classGroupId);
    }
    const m = await prisma.lessonMaterial.create({
      data: { ...req.body, lessonDate: new Date(req.body.lessonDate) },
      include: { subject: true },
    });
    res.status(201).json(m);
  } catch (e) {
    sendResolveError(res, e);
  }
});

router.delete('/materials/:id', async (req: AuthRequest, res) => {
  try {
    await assertMaterialAccessible(req, paramId(req.params.id));
    await prisma.lessonMaterial.delete({ where: { id: paramId(req.params.id) } });
    res.status(204).send();
  } catch (e) {
    sendResolveError(res, e);
  }
});

router.get('/quizzes', async (req: AuthRequest, res) => {
  res.json(
    await prisma.quiz.findMany({
      where: { teacherId: req.user!.userId },
      include: { subject: true, _count: { select: { questions: true, attempts: true } } },
    })
  );
});

router.post('/quizzes', async (req, res) => {
  const { title, subjectId, classGroupId, timeLimitMin, questions } = req.body;
  const quiz = await prisma.quiz.create({
    data: {
      title,
      subjectId,
      classGroupId,
      teacherId: (req as AuthRequest).user!.userId,
      timeLimitMin,
      questions: {
        create: questions.map((q: { text: string; type: string; points: number; options?: { text: string; isCorrect: boolean }[] }) => ({
          text: q.text,
          type: q.type,
          points: q.points ?? 1,
          options: q.options ? { create: q.options } : undefined,
        })),
      },
    },
    include: { questions: { include: { options: true } } },
  });
  res.status(201).json(quiz);
});

router.get('/quizzes/:id', async (req, res) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: paramId(req.params.id) },
    include: { questions: { include: { options: true } }, attempts: true },
  });
  res.json(quiz);
});

router.get('/analytics', async (req: AuthRequest, res) => {
  const assignments = await prisma.teacherAssignment.findMany({
    where: { teacherId: req.user!.userId },
    include: { subject: true, classGroup: true },
  });
  const stats = await Promise.all(
    assignments.map(async (a) => {
      const records = await prisma.lessonRecord.findMany({
        where: { classGroupId: a.classGroupId, subjectId: a.subjectId, grade: { not: null } },
      });
      const avg = records.length
        ? records.reduce((s, r) => s + (r.grade ?? 0), 0) / records.length
        : 0;
      const overdue = await prisma.homeworkSubmission.count({
        where: {
          status: 'NOT_SUBMITTED',
          homework: { classGroupId: a.classGroupId, subjectId: a.subjectId, dueDate: { lt: new Date() } },
        },
      });
      return { assignment: a, averageGrade: Math.round(avg * 10) / 10, overdueCount: overdue };
    })
  );
  res.json(stats);
});

export default router;
