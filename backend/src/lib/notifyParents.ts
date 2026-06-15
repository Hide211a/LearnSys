import { prisma } from './prisma.js';

/** Сповіщення батьків учнів (з посиланням на кабінет батька для конкретної дитини). */
export async function notifyParentsOfStudents(
  studentIds: string[],
  data: { title: string; message: string; linkPath: 'homework' | 'grades' }
) {
  if (!studentIds.length) return;
  const links = await prisma.parentLink.findMany({
    where: { childId: { in: studentIds } },
    select: { parentId: true, childId: true },
  });
  const linkBase =
    data.linkPath === 'grades' ? '/parent/grades' : '/parent/homework';
  await Promise.all(
    links.map((l) =>
      prisma.notification.create({
        data: {
          userId: l.parentId,
          title: data.title,
          message: data.message,
          link: `${linkBase}?childId=${l.childId}`,
        },
      })
    )
  );
}
