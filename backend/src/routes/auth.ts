import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/auth.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Невірні дані' });
    return;
  }
  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      include: { classGroup: true },
    });
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      res.status(401).json({ error: 'Невірний email або пароль' });
      return;
    }
    const token = signToken({ userId: user.id, role: user.role, email: user.email });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        patronymic: user.patronymic,
        role: user.role,
        classGroupId: user.classGroupId,
        classGroup: user.classGroup,
      },
    });
  } catch (err) {
    console.error('Login failed:', err);
    res.status(503).json({ error: 'База даних недоступна. Спробуйте пізніше.' });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { classGroup: true, children: { include: { child: { include: { classGroup: true } } } } },
  });
  if (!user) {
    res.status(404).json({ error: 'Користувача не знайдено' });
    return;
  }
  const { passwordHash: _, ...safe } = user;
  res.json(safe);
});

router.patch('/profile', authenticate, async (req: AuthRequest, res) => {
  const { firstName, lastName, patronymic, avatarUrl, currentPassword, newPassword } = req.body;
  const data: Record<string, string | null> = {};
  if (firstName) data.firstName = firstName;
  if (lastName) data.lastName = lastName;
  if (patronymic !== undefined) data.patronymic = patronymic;
  if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;

  if (newPassword) {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user || !(await bcrypt.compare(currentPassword ?? '', user.passwordHash))) {
      res.status(400).json({ error: 'Невірний поточний пароль' });
      return;
    }
    data.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  const updated = await prisma.user.update({
    where: { id: req.user!.userId },
    data,
    include: { classGroup: true },
  });
  const { passwordHash: _, ...safe } = updated;
  res.json(safe);
});

export default router;
