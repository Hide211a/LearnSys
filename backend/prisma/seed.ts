import { PrismaClient, Role, Attendance, type ClassGroup } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const GRADES = [5, 6, 7, 8, 9, 10, 11] as const;
const SECTIONS = ['А', 'Б'] as const;

const STUDENT_FIRST = [
  'Андрій',
  'Софія',
  'Дмитро',
  'Анастасія',
  'Максим',
  'Вікторія',
  'Ірина',
  'Олег',
  'Катерина',
  'Артем',
  'Юлія',
  'Богдан',
  'Дарина',
  'Іван',
  'Марія',
];
const STUDENT_LAST = [
  'Мельник',
  'Бондар',
  'Кравченко',
  'Ткаченко',
  'Олійник',
  'Савченко',
  'Гнатюк',
  'Сидоренко',
  'Романюк',
  'Коваль',
  'Лисенко',
  'Шевченко',
  'Мороз',
  'Коваленко',
  'Петренко',
];

function sectionSlug(section: string) {
  return section === 'А' ? 'a' : 'b';
}

type AssignmentSeed = {
  teacherId: string;
  subjectId: string;
  subjectCode: string;
  classGroupId: string;
  grade: number;
};

const ROOM_BY_CODE: Record<string, string> = {
  MATH: '12',
  UKR: '11',
  ENG: '5',
  GEO: '8',
  BIO: '8',
  PHYS: '22',
  CHEM: '22',
  INFO: '14',
  HIST: '18',
};

const TOPICS_BY_CODE: Record<string, string[]> = {
  MATH: ['Дроби та відсотки', 'Лінійні рівняння', 'Геометрія: кути', 'Функції та графіки', 'Підготовка до контрольної'],
  UKR: ['Орфографія', 'Усний переказ', 'Твір-опис', 'Аналіз вірша', 'Правопис прислівників'],
  ENG: ['Present Simple', 'Vocabulary: School', 'Reading comprehension', 'Listening practice', 'Writing an email'],
  GEO: ['Карта України', 'Клімат і рельєф', 'Населення Європи', 'Гідросфера', 'Природні зони'],
  BIO: ['Клітина будова', 'Фотосинтез', 'Людина: травлення', 'Екосистеми', 'Спадковість'],
  PHYS: ['Механіка: швидкість', 'Сили в природі', 'Електричний струм', 'Оптика', 'Лабораторна робота'],
  CHEM: ['Будова атома', 'Хімічні реакції', 'Розчини', 'Кислоти і основи', 'Органічна хімія'],
  INFO: ['Алгоритми', 'Безпека в інтернеті', 'Текстовий редактор', 'Презентації', 'Логіка програмування'],
  HIST: ['Київська Русь', 'Козацька доба', 'Україна в XX ст.', 'Друга світова війна', 'Незалежність України'],
};

const HW_BY_CODE: Record<string, { title: string; description: string }[]> = {
  MATH: [
    { title: 'Вправи 45–48', description: 'Підручник стор. 78–80. Виконати в зошиті.' },
    { title: 'Контрольна підготовка', description: 'Повторити правила дробів, приклади 12–15.' },
    { title: 'Задачі на рівняння', description: 'Стор. 92–94, непарні номери.' },
  ],
  UKR: [
    { title: 'Правопис', description: 'Впр. 34–36. Переписати речення з орфограмами.' },
    { title: 'Твір-опис', description: 'Опис осені (10–12 речень). Чернетка до п’ятниці.' },
    { title: 'Читання', description: 'Прочитати оповідання, скласти план.' },
  ],
  ENG: [
    { title: 'Workbook p.24', description: 'Exercises 1–5. Write full sentences.' },
    { title: 'Vocabulary list', description: 'Learn 20 words, quiz next lesson.' },
    { title: 'Reading', description: 'Text p.56, answer questions 1–8.' },
  ],
  GEO: [
    { title: 'Карта', description: 'Позначити річки та міста на контурній карті.' },
    { title: 'Реферат', description: 'Короткий опис клімату обраного регіону (1 стор.).' },
  ],
  BIO: [
    { title: 'Параграф 12', description: 'Конспект + питання в кінці параграфа.' },
    { title: 'Малюнок', description: 'Схема будови клітини.' },
  ],
  PHYS: [
    { title: 'Задачі', description: 'Стор. 45–47, всі задачі з розв’язком.' },
    { title: 'Лабораторний звіт', description: 'Оформити висновки за зошитом.' },
  ],
  CHEM: [
    { title: 'Рівняння реакцій', description: 'Скласти 5 рівнянь за зразком.' },
    { title: 'Таблиця', description: 'Заповнити таблицю властивостей металів.' },
  ],
  INFO: [
    { title: 'Практична', description: 'Створити презентацію на 5 слайдів.' },
    { title: 'Тест онлайн', description: 'Пройти вправи в електронному зошиті.' },
  ],
  HIST: [
    { title: 'Хронологія', description: 'Скласти таблицю ключових дат теми.' },
    { title: 'Питання', description: 'Відповіді на питання після §12.' },
  ],
};

function pick<T>(arr: T[], index: number): T {
  return arr[index % arr.length];
}

async function createFullSchedule(
  assignments: AssignmentSeed[],
  prisma: PrismaClient
) {
  const teacherBusy = new Map<string, Set<string>>();
  const classBusy = new Map<string, Set<string>>();

  const occupy = (teacherId: string, classId: string, day: number, lesson: number) => {
    const key = `${day}-${lesson}`;
    if (!teacherBusy.has(teacherId)) teacherBusy.set(teacherId, new Set());
    if (!classBusy.has(classId)) classBusy.set(classId, new Set());
    if (teacherBusy.get(teacherId)!.has(key) || classBusy.get(classId)!.has(key)) return false;
    teacherBusy.get(teacherId)!.add(key);
    classBusy.get(classId)!.add(key);
    return true;
  };

  let seed = 0;
  for (const a of assignments) {
    const lessonsPerWeek = a.subjectCode === 'MATH' || a.subjectCode === 'UKR' ? 2 : 1;
    for (let k = 0; k < lessonsPerWeek; k++) {
      let placed = false;
      for (let attempt = 0; attempt < 50 && !placed; attempt++) {
        const day = ((seed + k + attempt) % 5) + 1;
        const lesson = ((a.grade + k + attempt) % 6) + 1;
        if (occupy(a.teacherId, a.classGroupId, day, lesson)) {
          await prisma.scheduleSlot.create({
            data: {
              dayOfWeek: day,
              lessonNumber: lesson,
              classGroupId: a.classGroupId,
              subjectId: a.subjectId,
              teacherId: a.teacherId,
              room: ROOM_BY_CODE[a.subjectCode] ?? '10',
            },
          });
          placed = true;
        }
      }
      seed++;
    }
  }
}

async function createHomeworkForAssignments(
  assignments: AssignmentSeed[],
  studentsByClass: Map<string, { id: string }[]>,
  prisma: PrismaClient
) {
  const now = Date.now();
  let hwIndex = 0;

  for (const a of assignments) {
    const templates = HW_BY_CODE[a.subjectCode] ?? [
      { title: 'Домашнє завдання', description: 'Виконати за підручником.' },
    ];
    const tpl = pick(templates, a.grade + hwIndex);
    hwIndex++;

    const daysAhead = 4 + (hwIndex % 12);
    const dueDate = new Date(now + daysAhead * 24 * 60 * 60 * 1000);
    dueDate.setHours(23, 59, 0, 0);

    const hw = await prisma.homework.create({
      data: {
        title: tpl.title,
        description: tpl.description,
        dueDate,
        classGroupId: a.classGroupId,
        subjectId: a.subjectId,
        teacherId: a.teacherId,
      },
    });

    const students = studentsByClass.get(a.classGroupId) ?? [];
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const mod = (hwIndex + i) % 5;
      let status: 'NOT_SUBMITTED' | 'SUBMITTED' | 'GRADED' | 'RETURNED' = 'NOT_SUBMITTED';
      let content: string | null = null;
      let grade: number | null = null;
      let submittedAt: Date | null = null;

      if (mod === 0) {
        status = 'GRADED';
        content = 'Виконано повністю.';
        grade = 9 + (i % 4);
        submittedAt = new Date(now - 2 * 24 * 60 * 60 * 1000);
      } else if (mod === 1) {
        status = 'SUBMITTED';
        content = 'Надіслано на перевірку.';
        submittedAt = new Date(now - 1 * 24 * 60 * 60 * 1000);
      } else if (mod === 2 && daysAhead < 7) {
        status = 'RETURNED';
        content = 'Потрібно допрацювати зауваження.';
        submittedAt = new Date(now - 3 * 24 * 60 * 60 * 1000);
      }

      await prisma.homeworkSubmission.create({
        data: {
          homeworkId: hw.id,
          studentId: student.id,
          status,
          content,
          grade,
          submittedAt,
        },
      });
    }
  }
}

function lastSchoolDays(count: number): Date[] {
  const dates: Date[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (dates.length < count) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return dates;
}

async function createLessonRecords(
  assignments: AssignmentSeed[],
  studentsByClass: Map<string, { id: string }[]>,
  prisma: PrismaClient
) {
  const schoolDays = lastSchoolDays(4);

  for (const a of assignments) {
    const topics = TOPICS_BY_CODE[a.subjectCode] ?? ['Урок'];
    const students = studentsByClass.get(a.classGroupId) ?? [];

    for (let dayOffset = 0; dayOffset < schoolDays.length; dayOffset++) {
      const lessonDate = schoolDays[dayOffset];
      const topic = pick(topics, a.grade + dayOffset);

      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const scoreBase = 7 + ((a.grade + i + dayOffset) % 5);
        const attendance =
          (i + dayOffset) % 11 === 0
            ? Attendance.ABSENT
            : (i + dayOffset) % 17 === 0
              ? Attendance.LATE
              : Attendance.PRESENT;

        await prisma.lessonRecord.create({
          data: {
            date: lessonDate,
            classGroupId: a.classGroupId,
            subjectId: a.subjectId,
            studentId: student.id,
            grade: attendance === Attendance.ABSENT ? null : scoreBase,
            topic,
            attendance,
          },
        });
      }
    }
  }
}

async function main() {
  await prisma.pollVote.deleteMany();
  await prisma.pollOption.deleteMany();
  await prisma.poll.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.quizOption.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.homeworkComment.deleteMany();
  await prisma.homeworkSubmission.deleteMany();
  await prisma.homework.deleteMany();
  await prisma.lessonMaterial.deleteMany();
  await prisma.lessonRecord.deleteMany();
  await prisma.scheduleSlot.deleteMany();
  await prisma.teacherAssignment.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.event.deleteMany();
  await prisma.parentLink.deleteMany();
  await prisma.user.deleteMany();
  await prisma.classGroup.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.schoolYear.deleteMany();

  const hash = await bcrypt.hash('password123', 10);

  const year = await prisma.schoolYear.create({
    data: {
      name: '2025–2026',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-05-31'),
      isCurrent: true,
    },
  });

  const classes: ClassGroup[] = [];
  for (const grade of GRADES) {
    for (const section of SECTIONS) {
      classes.push(
        await prisma.classGroup.create({
          data: { name: `${grade}-${section}`, grade, schoolYearId: year.id },
        })
      );
    }
  }

  const classByName = new Map(classes.map((c) => [c.name, c]));
  const class5A = classByName.get('5-А')!;

  const math = await prisma.subject.create({ data: { name: 'Математика', code: 'MATH' } });
  const ukr = await prisma.subject.create({ data: { name: 'Українська мова', code: 'UKR' } });
  const hist = await prisma.subject.create({ data: { name: 'Історія України', code: 'HIST' } });
  const eng = await prisma.subject.create({ data: { name: 'Англійська мова', code: 'ENG' } });
  const geo = await prisma.subject.create({ data: { name: 'Географія', code: 'GEO' } });
  const bio = await prisma.subject.create({ data: { name: 'Біологія', code: 'BIO' } });
  const phys = await prisma.subject.create({ data: { name: 'Фізика', code: 'PHYS' } });
  const chem = await prisma.subject.create({ data: { name: 'Хімія', code: 'CHEM' } });
  const info = await prisma.subject.create({ data: { name: 'Інформатика', code: 'INFO' } });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@kuzgym.local',
      passwordHash: hash,
      firstName: 'Олена',
      lastName: 'Коваленко',
      role: Role.ADMIN,
    },
  });

  const teacher = await prisma.user.create({
    data: {
      email: 'teacher@kuzgym.local',
      passwordHash: hash,
      firstName: 'Іван',
      lastName: 'Петренко',
      patronymic: 'Сергійович',
      role: Role.TEACHER,
    },
  });

  const teacher2 = await prisma.user.create({
    data: {
      email: 'teacher2@kuzgym.local',
      passwordHash: hash,
      firstName: 'Марія',
      lastName: 'Шевченко',
      role: Role.TEACHER,
    },
  });

  const teacher3 = await prisma.user.create({
    data: {
      email: 'teacher3@kuzgym.local',
      passwordHash: hash,
      firstName: 'Олександр',
      lastName: 'Кравець',
      patronymic: 'Володимирович',
      role: Role.TEACHER,
    },
  });

  const teacher4 = await prisma.user.create({
    data: {
      email: 'teacher4@kuzgym.local',
      passwordHash: hash,
      firstName: 'Тетяна',
      lastName: 'Лисенко',
      role: Role.TEACHER,
    },
  });

  const teacher5 = await prisma.user.create({
    data: {
      email: 'teacher5@kuzgym.local',
      passwordHash: hash,
      firstName: 'Віктор',
      lastName: 'Бондаренко',
      role: Role.TEACHER,
    },
  });

  const teacher6 = await prisma.user.create({
    data: {
      email: 'teacher6@kuzgym.local',
      passwordHash: hash,
      firstName: 'Наталія',
      lastName: 'Іваненко',
      role: Role.TEACHER,
    },
  });

  const allStudents: { id: string }[] = [];
  const studentsByClass = new Map<string, { id: string }[]>();
  let nameIdx = 0;

  for (const cls of classes) {
    studentsByClass.set(cls.id, []);
    const m = cls.name.match(/^(\d+)-(.+)$/);
    const grade = m ? Number(m[1]) : cls.grade;
    const section = m ? m[2] : 'А';
    const slug = sectionSlug(section);

    for (let n = 1; n <= 5; n++) {
      const email =
        grade === 5 && section === 'А' && n === 1
          ? 'student1@kuzgym.local'
          : `s${grade}${slug}${n}@kuzgym.local`;

      const student = await prisma.user.create({
        data: {
          email,
          passwordHash: hash,
          firstName: STUDENT_FIRST[nameIdx % STUDENT_FIRST.length],
          lastName: STUDENT_LAST[(nameIdx + grade) % STUDENT_LAST.length],
          role: Role.STUDENT,
          classGroupId: cls.id,
        },
      });
      allStudents.push(student);
      studentsByClass.get(cls.id)!.push(student);
      nameIdx++;
    }
  }

  const students5A = allStudents.slice(0, 5);

  const parent = await prisma.user.create({
    data: {
      email: 'parent@kuzgym.local',
      passwordHash: hash,
      firstName: 'Наталія',
      lastName: 'Мельник',
      role: Role.PARENT,
    },
  });

  const student6A1 = allStudents[10];

  await prisma.parentLink.create({
    data: { parentId: parent.id, childId: students5A[0].id },
  });
  await prisma.parentLink.create({
    data: { parentId: parent.id, childId: student6A1.id },
  });

  const parent2 = await prisma.user.create({
    data: {
      email: 'parent2@kuzgym.local',
      passwordHash: hash,
      firstName: 'Олег',
      lastName: 'Романюк',
      role: Role.PARENT,
    },
  });

  const students7A = allStudents.slice(20, 25);
  await prisma.parentLink.create({
    data: { parentId: parent2.id, childId: students7A[0].id },
  });

  const assignmentRows: {
    teacherId: string;
    subjectId: string;
    classGroupId: string;
  }[] = [];
  const assignmentSeeds: AssignmentSeed[] = [];

  const pushAssignment = (row: {
    teacherId: string;
    subjectId: string;
    subjectCode: string;
    classGroupId: string;
    grade: number;
  }) => {
    assignmentRows.push({
      teacherId: row.teacherId,
      subjectId: row.subjectId,
      classGroupId: row.classGroupId,
    });
    assignmentSeeds.push(row);
  };

  for (const cls of classes) {
    const g = cls.grade;
    pushAssignment({
      teacherId: teacher.id,
      subjectId: math.id,
      subjectCode: 'MATH',
      classGroupId: cls.id,
      grade: g,
    });
    pushAssignment({
      teacherId: teacher6.id,
      subjectId: ukr.id,
      subjectCode: 'UKR',
      classGroupId: cls.id,
      grade: g,
    });
    pushAssignment({
      teacherId: teacher2.id,
      subjectId: eng.id,
      subjectCode: 'ENG',
      classGroupId: cls.id,
      grade: g,
    });
    pushAssignment({
      teacherId: teacher5.id,
      subjectId: info.id,
      subjectCode: 'INFO',
      classGroupId: cls.id,
      grade: g,
    });
    if (g >= 6) {
      pushAssignment({
        teacherId: teacher3.id,
        subjectId: geo.id,
        subjectCode: 'GEO',
        classGroupId: cls.id,
        grade: g,
      });
      pushAssignment({
        teacherId: teacher3.id,
        subjectId: bio.id,
        subjectCode: 'BIO',
        classGroupId: cls.id,
        grade: g,
      });
    }
    if (g >= 7) {
      pushAssignment({
        teacherId: teacher4.id,
        subjectId: phys.id,
        subjectCode: 'PHYS',
        classGroupId: cls.id,
        grade: g,
      });
    }
    if (g >= 8) {
      pushAssignment({
        teacherId: teacher2.id,
        subjectId: hist.id,
        subjectCode: 'HIST',
        classGroupId: cls.id,
        grade: g,
      });
    }
    if (g >= 10) {
      pushAssignment({
        teacherId: teacher4.id,
        subjectId: chem.id,
        subjectCode: 'CHEM',
        classGroupId: cls.id,
        grade: g,
      });
    }
  }

  await prisma.teacherAssignment.createMany({ data: assignmentRows });

  await createFullSchedule(assignmentSeeds, prisma);
  await createLessonRecords(assignmentSeeds, studentsByClass, prisma);
  await createHomeworkForAssignments(assignmentSeeds, studentsByClass, prisma);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.announcement.create({
    data: {
      title: 'Ласкаво просимо до платформи!',
      content: 'Це демонстраційна версія освітньої платформи Кузьмівської гімназії.',
      isGlobal: true,
      authorId: admin.id,
    },
  });

  await prisma.announcement.create({
    data: {
      title: 'Контрольна з математики',
      content: 'Наступного тижня — контрольна робота з теми «Дроби».',
      classGroupId: class5A.id,
      authorId: teacher.id,
    },
  });

  const class7A = classByName.get('7-А')!;
  const class11A = classByName.get('11-А')!;

  const holidaySeeds = [
    { title: 'Осінні канікули', start: '2025-10-27', end: '2025-11-02' },
    { title: 'Зимові канікули', start: '2025-12-25', end: '2026-01-07' },
    { title: 'Весняні канікули', start: '2026-03-23', end: '2026-03-29' },
    { title: 'Літні канікули', start: '2026-05-31', end: '2026-08-31' },
  ];
  for (const h of holidaySeeds) {
    await prisma.event.create({
      data: {
        title: h.title,
        description: 'Офіційні канікули згідно з календарем навчального року.',
        startDate: new Date(h.start),
        endDate: new Date(h.end),
        isHoliday: true,
      },
    });
  }

  const eventSeeds = [
    {
      title: 'Батьківські збори 5-А',
      description: 'Обговорення успішності та правил платформи.',
      start: '2025-12-15T17:00:00',
      classGroupId: class5A.id,
    },
    {
      title: 'День відкритих дверей',
      description: 'Екскурсія школою для майбутніх учнів.',
      start: '2026-02-14T10:00:00',
      classGroupId: null,
    },
    {
      title: 'Олімпіада з математики (шкільний етап)',
      start: '2026-01-20T09:00:00',
      classGroupId: class7A.id,
    },
    {
      title: 'ЗІЗ (пробний)',
      description: 'Пробне тестування для 11 класів.',
      start: '2026-02-05T09:00:00',
      end: '2026-02-05T13:00:00',
      classGroupId: class11A.id,
    },
    {
      title: 'Свято останнього дзвоника',
      start: '2026-05-29T11:00:00',
      classGroupId: class11A.id,
    },
  ];
  for (const ev of eventSeeds) {
    await prisma.event.create({
      data: {
        title: ev.title,
        description: ev.description ?? null,
        startDate: new Date(ev.start),
        endDate: ev.end ? new Date(ev.end) : null,
        isHoliday: false,
        classGroupId: ev.classGroupId,
      },
    });
  }

  await prisma.quiz.create({
    data: {
      title: 'Перевірка: Дроби',
      subjectId: math.id,
      classGroupId: class5A.id,
      teacherId: teacher.id,
      timeLimitMin: 15,
      questions: {
        create: [
          {
            text: '2/4 = ?',
            type: 'SINGLE',
            points: 1,
            options: {
              create: [
                { text: '1/2', isCorrect: true },
                { text: '2/3', isCorrect: false },
                { text: '3/4', isCorrect: false },
              ],
            },
          },
          {
            text: 'Які дроби рівні 0,5?',
            type: 'MULTIPLE',
            points: 2,
            options: {
              create: [
                { text: '1/2', isCorrect: true },
                { text: '2/4', isCorrect: true },
                { text: '1/3', isCorrect: false },
              ],
            },
          },
        ],
      },
    },
  });

  const materialSamples = [
    { title: 'Презентація: Дроби', subjectId: math.id, classGroupId: class5A.id },
    { title: 'Граматика: орфографія', subjectId: ukr.id, classGroupId: class5A.id },
    { title: 'Present Simple — конспект', subjectId: eng.id, classGroupId: classByName.get('6-А')!.id },
    { title: 'Карти Європи', subjectId: geo.id, classGroupId: classByName.get('8-Б')!.id },
    { title: 'Лабораторна: оптика', subjectId: phys.id, classGroupId: class7A.id },
    { title: 'Алгоритми — PDF', subjectId: info.id, classGroupId: classByName.get('9-А')!.id },
  ];
  for (const m of materialSamples) {
    await prisma.lessonMaterial.create({
      data: {
        title: m.title,
        linkUrl: 'https://example.com/material',
        subjectId: m.subjectId,
        classGroupId: m.classGroupId,
        lessonDate: today,
      },
    });
  }

  await prisma.poll.create({
    data: {
      question: 'Коли зручніше писати контрольну?',
      classGroupId: class5A.id,
      authorId: teacher.id,
      options: {
        create: [{ text: 'Вівторок' }, { text: 'Четвер' }, { text: 'П’ятниця' }],
      },
    },
  });

  const slotCount = await prisma.scheduleSlot.count();
  const hwCount = await prisma.homework.count();
  const journalCount = await prisma.lessonRecord.count();

  console.log('Seed OK. Облікові записи (пароль: password123):');
  console.log(`  Класів: ${classes.length} (5–11 паралель, по 2 класи: А та Б)`);
  console.log(`  Учнів: ${allStudents.length} (по 5 у кожному класі)`);
  console.log(`  Розклад: ${slotCount} уроків | ДЗ: ${hwCount} | Журнал: ${journalCount} записів`);
  console.log('  admin@kuzgym.local');
  console.log('  teacher@kuzgym.local   — Петренко (математика)');
  console.log('  teacher6@kuzgym.local  — Іваненко (українська мова)');
  console.log('  student1@kuzgym.local  — учень 5-А');
  console.log('  s6a3@kuzgym.local      — приклад: 6-А, учень №3');
  console.log('  s11b5@kuzgym.local     — приклад: 11-Б, учень №5');
  console.log('  parent@kuzgym.local   — діти: 5-А (student1) та 6-А');
  console.log('  parent2@kuzgym.local  — дитина: 7-А');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
