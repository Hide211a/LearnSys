import { Router } from 'express';
import { Role, HomeworkStatus, Attendance } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { paramId } from '../lib/params.js';
import { resolveStudentId, sendResolveError } from '../lib/parentAccess.js';
import { assertHomeworkViewAccess } from '../lib/teacherAccess.js';

const router = Router();
router.use(authenticate);

function todayDayOfWeek(): number {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

function hwPath(role: Role, childId?: string) {
  if (role === Role.PARENT) return `/parent/homework?childId=${childId ?? ''}`;
  return '/student/homework';
}

async function buildDashboard(studentId: string, role: Role) {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: { classGroup: true },
  });
  if (!student?.classGroupId) {
    return {
      student,
      summary: null,
      todayLessons: [],
      upcomingHomework: [],
      recentGrades: [],
      tasks: [],
      upcomingEvents: [],
      alerts: [],
    };
  }

  const classGroupId = student.classGroupId;
  const dow = todayDayOfWeek();
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const todayLessons =
    dow <= 5
      ? await prisma.scheduleSlot.findMany({
          where: { classGroupId, dayOfWeek: dow },
          include: {
            subject: true,
            teacher: { select: { firstName: true, lastName: true } },
          },
          orderBy: { lessonNumber: 'asc' },
        })
      : [];

  const allHomework = await prisma.homework.findMany({
    where: { classGroupId },
    include: {
      subject: true,
      submissions: { where: { studentId } },
    },
    orderBy: { dueDate: 'asc' },
  });

  let pendingHomework = 0;
  let overdueHomework = 0;
  let returnedHomework = 0;
  for (const h of allHomework) {
    const status = h.submissions[0]?.status ?? HomeworkStatus.NOT_SUBMITTED;
    const overdue = h.dueDate < now;
    if (status === HomeworkStatus.RETURNED) returnedHomework++;
    else if (status === HomeworkStatus.NOT_SUBMITTED) {
      if (overdue) overdueHomework++;
      else pendingHomework++;
    }
  }

  const upcomingHomework = allHomework
    .filter((h) => {
      const st = h.submissions[0]?.status ?? HomeworkStatus.NOT_SUBMITTED;
      return (
        h.dueDate >= now &&
        (st === HomeworkStatus.NOT_SUBMITTED || st === HomeworkStatus.RETURNED)
      );
    })
    .slice(0, 6)
    .map((h) => ({
      id: h.id,
      title: h.title,
      dueDate: h.dueDate,
      subject: h.subject,
      status: h.submissions[0]?.status ?? HomeworkStatus.NOT_SUBMITTED,
    }));

  const gradeRecords = await prisma.lessonRecord.findMany({
    where: { studentId, grade: { not: null } },
    select: { grade: true, subjectId: true, subject: { select: { name: true } } },
  });
  const overallAverage =
    gradeRecords.length > 0
      ? Math.round(
          (gradeRecords.reduce((s, r) => s + (r.grade ?? 0), 0) / gradeRecords.length) * 10
        ) / 10
      : null;

  const recentGrades = await prisma.lessonRecord.findMany({
    where: { studentId, grade: { not: null } },
    include: { subject: true },
    orderBy: { date: 'desc' },
    take: 6,
  });

  const upcomingEvents = await prisma.event.findMany({
    where: {
      OR: [{ classGroupId: null }, { classGroupId }],
      startDate: { gte: now },
    },
    orderBy: { startDate: 'asc' },
    take: 5,
  });

  const quizzesCount = await prisma.quiz.count({ where: { classGroupId } });
  const materialsCount = await prisma.lessonMaterial.count({ where: { classGroupId } });

  const absencesWeek = await prisma.lessonRecord.count({
    where: {
      studentId,
      attendance: Attendance.ABSENT,
      date: { gte: weekAgo },
    },
  });

  const bySubject: Record<string, { sum: number; n: number; name: string }> = {};
  for (const r of gradeRecords) {
    if (!r.grade) continue;
    if (!bySubject[r.subjectId]) {
      bySubject[r.subjectId] = { sum: 0, n: 0, name: r.subject.name };
    }
    bySubject[r.subjectId].sum += r.grade;
    bySubject[r.subjectId].n++;
  }

  const childQ = role === Role.PARENT ? studentId : undefined;
  const tasks: { type: string; title: string; count: number; path: string }[] = [];
  const alerts: { type: string; title: string; severity: 'warning' | 'error' | 'info' }[] = [];

  if (overdueHomework > 0) {
    tasks.push({
      type: 'overdue',
      title: role === Role.PARENT ? 'Прострочені ДЗ дитини' : 'Прострочені домашні завдання',
      count: overdueHomework,
      path: hwPath(role, childQ),
    });
    alerts.push({
      type: 'overdue',
      title: `Прострочених завдань: ${overdueHomework}`,
      severity: 'error',
    });
  }
  if (pendingHomework > 0 && role === Role.STUDENT) {
    tasks.push({
      type: 'pending',
      title: 'Здати домашні завдання',
      count: pendingHomework,
      path: hwPath(role, childQ),
    });
  }
  if (returnedHomework > 0) {
    tasks.push({
      type: 'returned',
      title: role === Role.PARENT ? 'ДЗ на доопрацюванні' : 'Допрацювати повернені роботи',
      count: returnedHomework,
      path: hwPath(role, childQ),
    });
    alerts.push({
      type: 'returned',
      title: `На доопрацюванні: ${returnedHomework}`,
      severity: 'warning',
    });
  }
  if (role === Role.PARENT && pendingHomework > 0) {
    alerts.push({
      type: 'pending',
      title: `ДЗ до здачі: ${pendingHomework}`,
      severity: 'warning',
    });
  }
  if (absencesWeek >= 2) {
    alerts.push({
      type: 'absence',
      title: `Відсутності за тиждень: ${absencesWeek}`,
      severity: 'warning',
    });
  }
  for (const s of Object.values(bySubject)) {
    const avg = s.n ? s.sum / s.n : 0;
    if (avg < 6) {
      alerts.push({
        type: 'low_grade',
        title: `Низький бал: ${s.name} (${Math.round(avg * 10) / 10})`,
        severity: 'warning',
      });
    }
  }

  return {
    student,
    summary: {
      lessonsToday: todayLessons.length,
      pendingHomework,
      overdueHomework,
      returnedHomework,
      overallAverage,
      quizzesCount,
      materialsCount,
      gradesCount: gradeRecords.length,
      absencesWeek,
    },
    todayLessons: todayLessons.map((l) => ({
      id: l.id,
      lessonNumber: l.lessonNumber,
      room: l.room,
      subjectName: l.subject.name,
      teacherName: `${l.teacher.lastName} ${l.teacher.firstName}`,
    })),
    upcomingHomework,
    recentGrades,
    upcomingEvents,
    tasks,
    alerts,
  };
}

router.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    const studentId = await resolveStudentId(req);
    if (!studentId) {
      res.status(400).json({ error: 'Оберіть учня' });
      return;
    }
    res.json(await buildDashboard(studentId, req.user!.role));
  } catch (e) {
    sendResolveError(res, e);
  }
});

router.get('/children', async (req: AuthRequest, res) => {
  if (req.user!.role !== Role.PARENT) {
    res.status(403).json({ error: 'Тільки для батьків' });
    return;
  }
  const links = await prisma.parentLink.findMany({
    where: { parentId: req.user!.userId },
    include: { child: { include: { classGroup: true } } },
  });
  res.json(links.map((l) => l.child));
});

router.get('/children-summary', async (req: AuthRequest, res) => {
  if (req.user!.role !== Role.PARENT) {
    res.status(403).json({ error: 'Тільки для батьків' });
    return;
  }
  const links = await prisma.parentLink.findMany({
    where: { parentId: req.user!.userId },
    include: { child: { include: { classGroup: true } } },
  });
  const summaries = await Promise.all(
    links.map(async (l) => {
      const dash = await buildDashboard(l.childId, Role.PARENT);
      return {
        child: l.child,
        summary: dash.summary,
        alertCount: dash.alerts.length,
      };
    })
  );
  res.json(summaries);
});

router.get('/schedule', async (req: AuthRequest, res) => {
  try {
    const studentId = await resolveStudentId(req);
    if (!studentId) {
      res.status(400).json({ error: 'Оберіть учня' });
      return;
    }
    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student?.classGroupId) {
      res.json([]);
      return;
    }
    res.json(
      await prisma.scheduleSlot.findMany({
        where: { classGroupId: student.classGroupId },
        include: { subject: true, teacher: { select: { firstName: true, lastName: true } } },
        orderBy: [{ dayOfWeek: 'asc' }, { lessonNumber: 'asc' }],
      })
    );
  } catch (e) {
    sendResolveError(res, e);
  }
});

router.get('/homework', async (req: AuthRequest, res) => {
  try {
    const studentId = await resolveStudentId(req);
    if (!studentId) {
      res.status(400).json({ error: 'Оберіть учня' });
      return;
    }
    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student?.classGroupId) {
      res.json([]);
      return;
    }
    const homework = await prisma.homework.findMany({
      where: { classGroupId: student.classGroupId },
      include: {
        subject: true,
        teacher: { select: { firstName: true, lastName: true } },
        submissions: { where: { studentId } },
      },
      orderBy: { dueDate: 'desc' },
    });
    res.json(
      homework.map((h) => ({
        ...h,
        mySubmission: h.submissions[0] ?? null,
        submissions: undefined,
        isOverdue:
          h.dueDate < new Date() &&
          (h.submissions[0]?.status ?? HomeworkStatus.NOT_SUBMITTED) ===
            HomeworkStatus.NOT_SUBMITTED,
      }))
    );
  } catch (e) {
    sendResolveError(res, e);
  }
});

router.post('/homework/:id/submit', async (req: AuthRequest, res) => {
  try {
  if (req.user!.role !== Role.STUDENT) {
    res.status(403).json({ error: 'Здавати роботи можуть лише учні' });
    return;
  }
  const homeworkId = paramId(req.params.id);
  await assertHomeworkViewAccess(req, homeworkId);
  const studentId = req.user!.userId;
  const { content, fileUrl } = req.body;
  const sub = await prisma.homeworkSubmission.upsert({
    where: { homeworkId_studentId: { homeworkId, studentId } },
    create: {
      homeworkId,
      studentId,
      content,
      fileUrl,
      status: HomeworkStatus.SUBMITTED,
      submittedAt: new Date(),
    },
    update: { content, fileUrl, status: HomeworkStatus.SUBMITTED, submittedAt: new Date() },
  });
  res.json(sub);
  } catch (e) {
    sendResolveError(res, e);
  }
});

router.get('/grades', async (req: AuthRequest, res) => {
  try {
    const studentId = await resolveStudentId(req);
    if (!studentId) {
      res.status(400).json({ error: 'Оберіть учня' });
      return;
    }
    const records = await prisma.lessonRecord.findMany({
      where: { studentId },
      include: { subject: true },
      orderBy: { date: 'desc' },
    });
    const bySubject: Record<string, { subject: string; grades: number[]; avg: number }> = {};
    for (const r of records) {
      if (!r.grade) continue;
      const key = r.subjectId;
      if (!bySubject[key]) {
        bySubject[key] = { subject: r.subject.name, grades: [], avg: 0 };
      }
      bySubject[key].grades.push(r.grade);
    }
    for (const k of Object.keys(bySubject)) {
      const g = bySubject[k].grades;
      bySubject[k].avg = Math.round((g.reduce((a, b) => a + b, 0) / g.length) * 10) / 10;
    }
    res.json({ records, summary: Object.values(bySubject) });
  } catch (e) {
    sendResolveError(res, e);
  }
});

router.get('/materials', async (req: AuthRequest, res) => {
  try {
    const studentId = await resolveStudentId(req);
    if (!studentId) {
      res.status(400).json({ error: 'Оберіть учня' });
      return;
    }
    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student?.classGroupId) {
      res.json([]);
      return;
    }
    res.json(
      await prisma.lessonMaterial.findMany({
        where: { classGroupId: student.classGroupId },
        include: { subject: true },
        orderBy: { lessonDate: 'desc' },
      })
    );
  } catch (e) {
    sendResolveError(res, e);
  }
});

router.get('/quizzes', async (req: AuthRequest, res) => {
  try {
    const studentId = await resolveStudentId(req);
    if (!studentId) {
      res.status(400).json({ error: 'Оберіть учня' });
      return;
    }
    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student?.classGroupId) {
      res.json([]);
      return;
    }
    const quizzes = await prisma.quiz.findMany({
      where: { classGroupId: student.classGroupId },
      include: {
        subject: true,
        attempts: { where: { studentId: student.id } },
        _count: { select: { questions: true } },
      },
    });
    res.json(quizzes);
  } catch (e) {
    sendResolveError(res, e);
  }
});

router.get('/quizzes/:id', async (req: AuthRequest, res) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: paramId(req.params.id) },
    include: { questions: { include: { options: true } } },
  });
  if (!quiz) {
    res.status(404).json({ error: 'Тест не знайдено' });
    return;
  }
  if (req.user!.role === Role.PARENT) {
    res.status(403).json({ error: 'Перегляд питань тесту недоступний для батьків' });
    return;
  }
  if (req.user!.role === Role.STUDENT) {
    res.json({
      ...quiz,
      questions: quiz.questions.map((q) => ({
        ...q,
        options: q.options.map((o) => ({ id: o.id, text: o.text, questionId: o.questionId })),
      })),
    });
    return;
  }
  res.json(quiz);
});

router.post('/quizzes/:id/attempt', async (req: AuthRequest, res) => {
  if (req.user!.role !== Role.STUDENT) {
    res.status(403).json({ error: 'Проходити тести можуть лише учні' });
    return;
  }
  const studentId = req.user!.userId;
  const { answers } = req.body as { answers: Record<string, string | string[]> };
  const quiz = await prisma.quiz.findUnique({
    where: { id: paramId(req.params.id) },
    include: { questions: { include: { options: true } } },
  });
  if (!quiz) {
    res.status(404).json({ error: 'Тест не знайдено' });
    return;
  }
  let earned = 0;
  let total = 0;
  for (const q of quiz.questions) {
    total += q.points;
    const ans = answers[q.id];
    if (q.type === 'OPEN') continue;
    const correctIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);
    if (q.type === 'SINGLE' && ans === correctIds[0]) earned += q.points;
    if (q.type === 'MULTIPLE' && Array.isArray(ans)) {
      const sorted = [...ans].sort().join(',');
      const correct = [...correctIds].sort().join(',');
      if (sorted === correct) earned += q.points;
    }
  }
  const score = total ? Math.round((earned / total) * 100) : 0;
  const attempt = await prisma.quizAttempt.upsert({
    where: { quizId_studentId: { quizId: quiz.id, studentId } },
    create: {
      quizId: quiz.id,
      studentId,
      score,
      answers: JSON.stringify(answers),
      completedAt: new Date(),
    },
    update: { score, answers: JSON.stringify(answers), completedAt: new Date() },
  });
  res.json(attempt);
});

export default router;
