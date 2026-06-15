import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRoles, type AuthRequest } from '../middleware/auth.js';
import { paramId } from '../lib/params.js';

const router = Router();
router.use(authenticate, requireRoles(Role.ADMIN));

router.get('/dashboard', async (_req, res) => {
  const now = new Date();
  const [
    classesCount,
    studentsCount,
    teachersCount,
    parentsCount,
    subjectsCount,
    assignmentsCount,
    scheduleSlotsCount,
    unassignedStudentsCount,
    currentSchoolYear,
    classes,
    unassignedStudents,
    teachersWithoutAssignments,
    upcomingEvents,
  ] = await Promise.all([
    prisma.classGroup.count(),
    prisma.user.count({ where: { role: Role.STUDENT } }),
    prisma.user.count({ where: { role: Role.TEACHER } }),
    prisma.user.count({ where: { role: Role.PARENT } }),
    prisma.subject.count(),
    prisma.teacherAssignment.count(),
    prisma.scheduleSlot.count(),
    prisma.user.count({ where: { role: Role.STUDENT, classGroupId: null } }),
    prisma.schoolYear.findFirst({ where: { isCurrent: true } }),
    prisma.classGroup.findMany({
      include: {
        schoolYear: { select: { name: true } },
        _count: { select: { students: true, assignments: true } },
      },
      orderBy: [{ grade: 'asc' }, { name: 'asc' }],
    }),
    prisma.user.findMany({
      where: { role: Role.STUDENT, classGroupId: null },
      select: { id: true, firstName: true, lastName: true, email: true },
      take: 10,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }),
    prisma.user.findMany({
      where: { role: Role.TEACHER, taughtAssignments: { none: {} } },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }),
    prisma.event.findMany({
      where: { startDate: { gte: now } },
      take: 6,
      orderBy: { startDate: 'asc' },
      include: { classGroup: { select: { name: true } } },
    }),
  ]);

  const classesWithoutTeachers = classes
    .filter((c) => c._count.assignments === 0)
    .map((c) => ({ id: c.id, name: c.name, grade: c.grade }));

  res.json({
    stats: {
      classes: classesCount,
      students: studentsCount,
      teachers: teachersCount,
      parents: parentsCount,
      subjects: subjectsCount,
      assignments: assignmentsCount,
      scheduleSlots: scheduleSlotsCount,
      unassignedStudents: unassignedStudentsCount,
    },
    currentSchoolYear,
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      grade: c.grade,
      schoolYearName: c.schoolYear.name,
      studentsCount: c._count.students,
      assignmentsCount: c._count.assignments,
    })),
    warnings: {
      classesWithoutTeachers,
      unassignedStudents,
      teachersWithoutAssignments,
    },
    upcomingEvents,
  });
});

router.get('/school-years', async (_req, res) => {
  res.json(
    await prisma.schoolYear.findMany({
      include: { _count: { select: { classes: true } } },
      orderBy: { startDate: 'desc' },
    })
  );
});

router.post('/school-years', async (req, res) => {
  const { name, startDate, endDate, isCurrent } = req.body;
  if (isCurrent) {
    await prisma.schoolYear.updateMany({ data: { isCurrent: false } });
  }
  const year = await prisma.schoolYear.create({
    data: { name, startDate: new Date(startDate), endDate: new Date(endDate), isCurrent: !!isCurrent },
  });
  res.status(201).json(year);
});

router.patch('/school-years/:id', async (req, res) => {
  const id = paramId(req.params.id);
  const { name, startDate, endDate, isCurrent } = req.body;
  if (isCurrent) {
    await prisma.schoolYear.updateMany({ data: { isCurrent: false } });
  }
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (startDate !== undefined) data.startDate = new Date(startDate);
  if (endDate !== undefined) data.endDate = new Date(endDate);
  if (isCurrent !== undefined) data.isCurrent = !!isCurrent;
  const year = await prisma.schoolYear.update({
    where: { id },
    data,
    include: { _count: { select: { classes: true } } },
  });
  res.json(year);
});

router.get('/classes', async (_req, res) => {
  res.json(
    await prisma.classGroup.findMany({
      include: {
        schoolYear: true,
        _count: { select: { students: true } },
        assignments: {
          include: {
            teacher: { select: { id: true, firstName: true, lastName: true } },
            subject: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ grade: 'asc' }, { name: 'asc' }],
    })
  );
});

router.post('/classes', async (req, res) => {
  const { name, grade, schoolYearId, classTeacherId } = req.body;
  const cls = await prisma.classGroup.create({
    data: { name, grade: Number(grade), schoolYearId, classTeacherId: classTeacherId || null },
  });
  res.status(201).json(cls);
});

router.patch('/classes/:id', async (req, res) => {
  const cls = await prisma.classGroup.update({
    where: { id: paramId(req.params.id) },
    data: req.body,
  });
  res.json(cls);
});

router.delete('/classes/:id', async (req, res) => {
  await prisma.classGroup.delete({ where: { id: paramId(req.params.id) } });
  res.status(204).send();
});

router.get('/classes/:id/students', async (req, res) => {
  const classGroupId = paramId(req.params.id);
  const students = await prisma.user.findMany({
    where: { classGroupId, role: Role.STUDENT },
    select: { id: true, email: true, firstName: true, lastName: true, patronymic: true },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });
  res.json(students);
});

router.post('/classes/:id/students', async (req, res) => {
  const classGroupId = paramId(req.params.id);
  const { email, password, firstName, lastName, patronymic } = req.body;
  const passwordHash = await bcrypt.hash(password ?? 'password123', 10);
  const student = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      patronymic,
      role: Role.STUDENT,
      classGroupId,
    },
    select: { id: true, email: true, firstName: true, lastName: true, patronymic: true },
  });
  res.status(201).json(student);
});

router.post('/classes/:id/students/assign', async (req, res) => {
  const classGroupId = paramId(req.params.id);
  const { userId } = req.body;
  const student = await prisma.user.update({
    where: { id: userId },
    data: { classGroupId },
    select: { id: true, email: true, firstName: true, lastName: true, classGroupId: true },
  });
  res.json(student);
});

router.delete('/classes/:classId/students/:userId', async (req, res) => {
  const userId = paramId(req.params.userId);
  const student = await prisma.user.findFirst({ where: { id: userId, role: Role.STUDENT } });
  if (!student) {
    res.status(404).json({ error: 'Учня не знайдено' });
    return;
  }
  await prisma.user.update({
    where: { id: userId },
    data: { classGroupId: null },
  });
  res.status(204).send();
});

router.get('/students/unassigned', async (_req, res) => {
  res.json(
    await prisma.user.findMany({
      where: { role: Role.STUDENT, classGroupId: null },
      select: { id: true, email: true, firstName: true, lastName: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })
  );
});

router.get('/subjects', async (_req, res) => {
  const subjects = await prisma.subject.findMany({
    include: {
      assignments: {
        include: {
          teacher: { select: { id: true, firstName: true, lastName: true } },
          classGroup: { select: { id: true, name: true, grade: true } },
        },
      },
      _count: {
        select: {
          assignments: true,
          homework: true,
          scheduleSlots: true,
          quizzes: true,
          lessonRecords: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });
  res.json(subjects);
});

router.post('/subjects', async (req, res) => {
  const name = String(req.body.name ?? '').trim();
  const code = String(req.body.code ?? '').trim().toUpperCase();
  if (!name || !code) {
    res.status(400).json({ error: 'Вкажіть назву та код предмета' });
    return;
  }
  try {
    const subject = await prisma.subject.create({ data: { name, code } });
    res.status(201).json(subject);
  } catch {
    res.status(409).json({ error: 'Предмет з таким кодом вже існує' });
  }
});

router.patch('/subjects/:id', async (req, res) => {
  const { name, code } = req.body;
  const data: { name?: string; code?: string } = {};
  if (name !== undefined) data.name = String(name).trim();
  if (code !== undefined) data.code = String(code).trim().toUpperCase();
  try {
    res.json(await prisma.subject.update({ where: { id: paramId(req.params.id) }, data }));
  } catch {
    res.status(409).json({ error: 'Предмет з таким кодом вже існує' });
  }
});

router.delete('/subjects/:id', async (req, res) => {
  const id = paramId(req.params.id);
  try {
    await prisma.subject.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(400).json({
      error: 'Не вдалося видалити предмет. Можливо, є пов’язані записи в журналі або розкладі.',
    });
  }
});

function compareStudentsByClass<
  T extends {
    lastName: string;
    firstName: string;
    classGroup?: { name: string; grade: number } | null;
  },
>(a: T, b: T): number {
  const gradeA = a.classGroup?.grade ?? 999;
  const gradeB = b.classGroup?.grade ?? 999;
  if (gradeA !== gradeB) return gradeA - gradeB;

  const classNameA = a.classGroup?.name ?? 'яяя';
  const classNameB = b.classGroup?.name ?? 'яяя';
  const byClass = classNameA.localeCompare(classNameB, 'uk');
  if (byClass !== 0) return byClass;

  const byLast = a.lastName.localeCompare(b.lastName, 'uk');
  if (byLast !== 0) return byLast;
  return a.firstName.localeCompare(b.firstName, 'uk');
}

router.get('/users', async (req, res) => {
  const role = req.query.role as Role | undefined;
  const isTeacher = role === Role.TEACHER;

  const users = await prisma.user.findMany({
    where: role ? { role } : undefined,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      patronymic: true,
      role: true,
      classGroupId: true,
      classGroup: true,
      createdAt: true,
      ...(isTeacher
        ? {
            taughtAssignments: {
              include: {
                subject: { select: { id: true, name: true, code: true } },
                classGroup: { select: { id: true, name: true, grade: true } },
              },
            },
          }
        : {}),
    },
    orderBy:
      role === Role.STUDENT
        ? undefined
        : [{ lastName: 'asc' }, { firstName: 'asc' }],
  });

  if (role === Role.STUDENT) {
    users.sort(compareStudentsByClass);
  }

  res.json(users);
});

router.post('/users', async (req, res) => {
  const { email, password, firstName, lastName, patronymic, role, classGroupId } = req.body;
  const passwordHash = await bcrypt.hash(password ?? 'password123', 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      patronymic,
      role,
      classGroupId: classGroupId || null,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      patronymic: true,
      role: true,
      classGroupId: true,
    },
  });
  res.status(201).json(user);
});

router.patch('/users/:id', async (req, res) => {
  const { password, ...rest } = req.body;
  const data: Record<string, unknown> = { ...rest };
  if (password) data.passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.update({
    where: { id: paramId(req.params.id) },
    data,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      patronymic: true,
      role: true,
      classGroupId: true,
      classGroup: true,
    },
  });
  res.json(user);
});

router.delete('/users/:id', async (req, res) => {
  await prisma.user.delete({ where: { id: paramId(req.params.id) } });
  res.status(204).send();
});

router.get('/users/:id/children', async (req, res) => {
  const parentId = paramId(req.params.id);
  const parent = await prisma.user.findUnique({ where: { id: parentId } });
  if (!parent || parent.role !== Role.PARENT) {
    res.status(400).json({ error: 'Користувач не є батьком' });
    return;
  }
  const links = await prisma.parentLink.findMany({
    where: { parentId },
    include: {
      child: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          classGroup: { select: { id: true, name: true } },
        },
      },
    },
  });
  res.json(links.map((l) => l.child));
});

router.post('/users/:id/children', async (req, res) => {
  const parentId = paramId(req.params.id);
  const { childId } = req.body as { childId: string };
  const parent = await prisma.user.findUnique({ where: { id: parentId } });
  if (!parent || parent.role !== Role.PARENT) {
    res.status(400).json({ error: 'Користувач не є батьком' });
    return;
  }
  const child = await prisma.user.findUnique({ where: { id: childId } });
  if (!child || child.role !== Role.STUDENT) {
    res.status(400).json({ error: 'Оберіть учня' });
    return;
  }
  await prisma.parentLink.upsert({
    where: { parentId_childId: { parentId, childId } },
    create: { parentId, childId },
    update: {},
  });
  res.status(201).json({ ok: true });
});

router.delete('/users/:id/children/:childId', async (req, res) => {
  const parentId = paramId(req.params.id);
  const childId = paramId(req.params.childId);
  await prisma.parentLink.deleteMany({ where: { parentId, childId } });
  res.status(204).send();
});

router.get('/assignments', async (_req, res) => {
  res.json(
    await prisma.teacherAssignment.findMany({
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        subject: true,
        classGroup: true,
      },
    })
  );
});

router.post('/assignments', async (req, res) => {
  const { teacherId, subjectId, classGroupId } = req.body;
  const a = await prisma.teacherAssignment.create({
    data: { teacherId, subjectId, classGroupId },
    include: { teacher: true, subject: true, classGroup: true },
  });
  res.status(201).json(a);
});

router.delete('/assignments/:id', async (req, res) => {
  await prisma.teacherAssignment.delete({ where: { id: paramId(req.params.id) } });
  res.status(204).send();
});

async function validateScheduleSlot(data: {
  classGroupId: string;
  dayOfWeek: number;
  lessonNumber: number;
  subjectId: string;
  teacherId: string;
  excludeId?: string;
}) {
  const day = Number(data.dayOfWeek);
  const lesson = Number(data.lessonNumber);
  if (day < 1 || day > 5 || lesson < 1 || lesson > 8) {
    return 'День тижня (1–5) або номер уроку (1–8) некоректні';
  }

  const assignment = await prisma.teacherAssignment.findFirst({
    where: {
      classGroupId: data.classGroupId,
      subjectId: data.subjectId,
      teacherId: data.teacherId,
    },
  });
  if (!assignment) {
    return 'Цей вчитель не призначений на обраний предмет у цьому класі. Спочатку додайте призначення.';
  }

  const classBusy = await prisma.scheduleSlot.findFirst({
    where: {
      classGroupId: data.classGroupId,
      dayOfWeek: day,
      lessonNumber: lesson,
      ...(data.excludeId ? { NOT: { id: data.excludeId } } : {}),
    },
  });
  if (classBusy) {
    return 'У цьому класі на обраний час уже заплановано інший урок';
  }

  const teacherBusy = await prisma.scheduleSlot.findFirst({
    where: {
      teacherId: data.teacherId,
      dayOfWeek: day,
      lessonNumber: lesson,
      ...(data.excludeId ? { NOT: { id: data.excludeId } } : {}),
    },
    include: { classGroup: { select: { name: true } } },
  });
  if (teacherBusy) {
    return `Вчитель уже веде урок у класі ${teacherBusy.classGroup.name} на цей час`;
  }

  return null;
}

router.get('/schedule', async (req, res) => {
  const { classGroupId, teacherId } = req.query;
  res.json(
    await prisma.scheduleSlot.findMany({
      where: {
        ...(classGroupId ? { classGroupId: String(classGroupId) } : {}),
        ...(teacherId ? { teacherId: String(teacherId) } : {}),
      },
      include: {
        subject: true,
        teacher: { select: { id: true, firstName: true, lastName: true } },
        classGroup: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { lessonNumber: 'asc' }],
    })
  );
});

router.post('/schedule', async (req, res) => {
  const { classGroupId, dayOfWeek, lessonNumber, subjectId, teacherId, room, isSubstitution, note } =
    req.body;
  const error = await validateScheduleSlot({
    classGroupId,
    dayOfWeek,
    lessonNumber,
    subjectId,
    teacherId,
  });
  if (error) {
    res.status(400).json({ error });
    return;
  }
  try {
    const slot = await prisma.scheduleSlot.create({
      data: {
        classGroupId,
        dayOfWeek: Number(dayOfWeek),
        lessonNumber: Number(lessonNumber),
        subjectId,
        teacherId,
        room: room || null,
        isSubstitution: !!isSubstitution,
        note: note || null,
      },
      include: { subject: true, teacher: true, classGroup: true },
    });
    res.status(201).json(slot);
  } catch {
    res.status(400).json({ error: 'Не вдалося додати урок. Перевірте дані.' });
  }
});

router.patch('/schedule/:id', async (req, res) => {
  const id = paramId(req.params.id);
  const existing = await prisma.scheduleSlot.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Урок не знайдено' });
    return;
  }
  const merged = {
    classGroupId: req.body.classGroupId ?? existing.classGroupId,
    dayOfWeek: req.body.dayOfWeek ?? existing.dayOfWeek,
    lessonNumber: req.body.lessonNumber ?? existing.lessonNumber,
    subjectId: req.body.subjectId ?? existing.subjectId,
    teacherId: req.body.teacherId ?? existing.teacherId,
  };
  const error = await validateScheduleSlot({ ...merged, excludeId: id });
  if (error) {
    res.status(400).json({ error });
    return;
  }
  try {
    res.json(
      await prisma.scheduleSlot.update({
        where: { id },
        data: {
          classGroupId: merged.classGroupId,
          dayOfWeek: Number(merged.dayOfWeek),
          lessonNumber: Number(merged.lessonNumber),
          subjectId: merged.subjectId,
          teacherId: merged.teacherId,
          room: req.body.room !== undefined ? req.body.room || null : existing.room,
          isSubstitution:
            req.body.isSubstitution !== undefined ? !!req.body.isSubstitution : existing.isSubstitution,
          note: req.body.note !== undefined ? req.body.note || null : existing.note,
        },
        include: { subject: true, teacher: true, classGroup: true },
      })
    );
  } catch {
    res.status(400).json({ error: 'Не вдалося оновити урок' });
  }
});

router.delete('/schedule/:id', async (req, res) => {
  await prisma.scheduleSlot.delete({ where: { id: paramId(req.params.id) } });
  res.status(204).send();
});

router.get('/events', async (req, res) => {
  const { type, classGroupId, from, to, q } = req.query;
  const now = new Date();

  const where: Record<string, unknown> = {};
  if (type === 'holiday') where.isHoliday = true;
  if (type === 'event') where.isHoliday = false;
  if (classGroupId === 'school') where.classGroupId = null;
  else if (classGroupId && classGroupId !== 'all') where.classGroupId = String(classGroupId);
  if (from || to) {
    const startDate: { gte?: Date; lte?: Date } = {};
    if (from) startDate.gte = new Date(String(from));
    if (to) startDate.lte = new Date(String(to));
    where.startDate = startDate;
  }
  if (q && String(q).trim()) {
    const term = String(q).trim();
    where.OR = [
      { title: { contains: term } },
      { description: { contains: term } },
    ];
  }

  const events = await prisma.event.findMany({
    where,
    include: { classGroup: { select: { id: true, name: true, grade: true } } },
    orderBy: { startDate: 'asc' },
  });

  const upcoming = events.filter((e) => (e.endDate ?? e.startDate) >= now).length;
  const holidays = events.filter((e) => e.isHoliday).length;

  res.json({
    events,
    stats: { total: events.length, upcoming, holidays, past: events.length - upcoming },
  });
});

router.post('/events', async (req, res) => {
  const { title, description, startDate, endDate, isHoliday, classGroupId } = req.body;
  if (!title?.trim() || !startDate) {
    res.status(400).json({ error: 'Вкажіть назву та дату початку' });
    return;
  }
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  if (end && end < start) {
    res.status(400).json({ error: 'Дата завершення не може бути раніше початку' });
    return;
  }
  const e = await prisma.event.create({
    data: {
      title: String(title).trim(),
      description: description?.trim() || null,
      startDate: start,
      endDate: end,
      isHoliday: !!isHoliday,
      classGroupId: classGroupId || null,
    },
    include: { classGroup: { select: { id: true, name: true, grade: true } } },
  });
  res.status(201).json(e);
});

router.patch('/events/:id', async (req, res) => {
  const id = paramId(req.params.id);
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Подію не знайдено' });
    return;
  }
  const { title, description, startDate, endDate, isHoliday, classGroupId } = req.body;
  const start = startDate ? new Date(startDate) : existing.startDate;
  const end =
    endDate !== undefined ? (endDate ? new Date(endDate) : null) : existing.endDate;
  if (end && end < start) {
    res.status(400).json({ error: 'Дата завершення не може бути раніше початку' });
    return;
  }
  const e = await prisma.event.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: String(title).trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      startDate: start,
      endDate: end,
      ...(isHoliday !== undefined && { isHoliday: !!isHoliday }),
      ...(classGroupId !== undefined && { classGroupId: classGroupId || null }),
    },
    include: { classGroup: { select: { id: true, name: true, grade: true } } },
  });
  res.json(e);
});

router.delete('/events/:id', async (req, res) => {
  await prisma.event.delete({ where: { id: paramId(req.params.id) } });
  res.status(204).send();
});

router.get('/analytics', async (req, res) => {
  const classGroupId = req.query.classGroupId ? String(req.query.classGroupId) : undefined;

  const [
    studentCount,
    teacherCount,
    classCount,
    parentCount,
    homeworkCount,
    gradeAgg,
    allGradedRecords,
  ] = await Promise.all([
    prisma.user.count({ where: { role: Role.STUDENT, ...(classGroupId ? { classGroupId } : {}) } }),
    prisma.user.count({ where: { role: Role.TEACHER } }),
    prisma.classGroup.count(),
    prisma.user.count({ where: { role: Role.PARENT } }),
    prisma.homework.count({ where: classGroupId ? { classGroupId } : {} }),
    prisma.lessonRecord.aggregate({
      where: { grade: { not: null }, ...(classGroupId ? { classGroupId } : {}) },
      _avg: { grade: true },
      _count: { id: true },
    }),
    prisma.lessonRecord.findMany({
      where: { grade: { not: null }, ...(classGroupId ? { classGroupId } : {}) },
      select: { grade: true },
    }),
  ]);

  const gradeDistribution = [
    { label: '1–5', count: 0, color: '#d32f2f' },
    { label: '6–8', count: 0, color: '#ed6c02' },
    { label: '9–10', count: 0, color: '#2e7d32' },
    { label: '11–12', count: 0, color: '#1565c0' },
  ];
  for (const r of allGradedRecords) {
    const g = r.grade!;
    if (g <= 5) gradeDistribution[0].count++;
    else if (g <= 8) gradeDistribution[1].count++;
    else if (g <= 10) gradeDistribution[2].count++;
    else gradeDistribution[3].count++;
  }

  const teachers = await prisma.user.findMany({
    where: { role: Role.TEACHER },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });

  const teacherLoad = await Promise.all(
    teachers.map(async (t) => ({
      teacher: t,
      lessonsPerWeek: await prisma.scheduleSlot.count({ where: { teacherId: t.id } }),
      assignmentsCount: await prisma.teacherAssignment.count({ where: { teacherId: t.id } }),
    }))
  );

  const classes = await prisma.classGroup.findMany({
    where: classGroupId ? { id: classGroupId } : undefined,
    include: {
      students: { select: { id: true } },
      _count: { select: { assignments: true } },
    },
    orderBy: [{ grade: 'asc' }, { name: 'asc' }],
  });

  const classStats = await Promise.all(
    classes.map(async (c) => {
      const records = await prisma.lessonRecord.findMany({
        where: { classGroupId: c.id },
        select: { grade: true, attendance: true },
      });
      const graded = records.filter((r) => r.grade != null);
      const avg = graded.length
        ? Math.round((graded.reduce((s, r) => s + (r.grade ?? 0), 0) / graded.length) * 10) / 10
        : null;
      const absent = records.filter((r) => r.attendance === 'ABSENT').length;
      const present = records.filter((r) => r.attendance === 'PRESENT').length;
      const late = records.filter((r) => r.attendance === 'LATE').length;
      const attTotal = absent + present + late;
      const hwTotal = await prisma.homework.count({ where: { classGroupId: c.id } });
      const submitted = await prisma.homeworkSubmission.count({
        where: {
          status: { in: ['SUBMITTED', 'GRADED'] },
          homework: { classGroupId: c.id },
        },
      });
      const overdue = await prisma.homeworkSubmission.count({
        where: {
          status: 'NOT_SUBMITTED',
          homework: { classGroupId: c.id, dueDate: { lt: new Date() } },
        },
      });
      return {
        classId: c.id,
        className: c.name,
        grade: c.grade,
        studentCount: c.students.length,
        assignmentsCount: c._count.assignments,
        averageGrade: avg,
        gradedRecords: graded.length,
        absentCount: absent,
        presentCount: present,
        lateCount: late,
        attendanceRate: attTotal > 0 ? Math.round((present / attTotal) * 100) : null,
        homeworkCount: hwTotal,
        homeworkSubmitted: submitted,
        overdueHomework: overdue,
      };
    })
  );

  const subjects = await prisma.subject.findMany({ orderBy: { name: 'asc' } });
  const subjectStats = await Promise.all(
    subjects.map(async (sub) => {
      const records = await prisma.lessonRecord.findMany({
        where: {
          subjectId: sub.id,
          grade: { not: null },
          ...(classGroupId ? { classGroupId } : {}),
        },
        select: { grade: true },
      });
      const avg = records.length
        ? Math.round((records.reduce((s, r) => s + (r.grade ?? 0), 0) / records.length) * 10) / 10
        : null;
      return {
        subjectId: sub.id,
        subjectName: sub.name,
        averageGrade: avg,
        recordsCount: records.length,
      };
    })
  );

  const enrollmentByGrade: { grade: number; students: number; classes: number }[] = [];
  const allClasses = classGroupId
    ? classes
    : await prisma.classGroup.findMany({
        include: { _count: { select: { students: true } } },
      });
  for (let g = 5; g <= 11; g++) {
    const inGrade = allClasses.filter((c) => c.grade === g);
    enrollmentByGrade.push({
      grade: g,
      classes: inGrade.length,
      students: inGrade.reduce((s, c) => s + ('students' in c ? c.students.length : c._count.students), 0),
    });
  }

  const atRiskStudents = await prisma.user.findMany({
    where: {
      role: Role.STUDENT,
      ...(classGroupId ? { classGroupId } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      classGroup: { select: { name: true } },
      lessonRecords: { where: { grade: { not: null } }, select: { grade: true, attendance: true } },
    },
    take: 200,
  });

  const studentsAtRisk = atRiskStudents
    .map((s) => {
      const grades = s.lessonRecords.filter((r) => r.grade != null);
      const avg = grades.length
        ? grades.reduce((sum, r) => sum + (r.grade ?? 0), 0) / grades.length
        : null;
      const absences = s.lessonRecords.filter((r) => r.attendance === 'ABSENT').length;
      return {
        id: s.id,
        name: `${s.lastName} ${s.firstName}`,
        className: s.classGroup?.name ?? '—',
        averageGrade: avg ? Math.round(avg * 10) / 10 : null,
        absences,
      };
    })
    .filter((s) => (s.averageGrade != null && s.averageGrade < 6) || s.absences >= 3)
    .sort((a, b) => (a.averageGrade ?? 0) - (b.averageGrade ?? 0))
    .slice(0, 15);

  res.json({
    overview: {
      students: studentCount,
      teachers: teacherCount,
      classes: classCount,
      parents: parentCount,
      homework: homeworkCount,
      averageGrade: gradeAgg._avg.grade ? Math.round(gradeAgg._avg.grade * 10) / 10 : null,
      gradedRecords: gradeAgg._count.id,
    },
    gradeDistribution,
    enrollmentByGrade,
    teacherLoad,
    classStats,
    subjectStats: subjectStats.filter((s) => s.recordsCount > 0),
    studentsAtRisk,
  });
});

export default router;
