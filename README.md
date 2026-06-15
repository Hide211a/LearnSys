# LearnSys

# Освітня платформа — ЗЗСО «Кузьмівська гімназія»

Інтерактивна веб-платформа для організації освітнього процесу (дипломний проєкт, React + Node.js).

## Стек

| Частина | Технології |
|---------|------------|
| Frontend | React 19, TypeScript, Vite, MUI, TanStack Query, React Router, Recharts |
| Backend | Node.js, Express, Prisma, SQLite, JWT |
| БД | SQLite (`backend/prisma/dev.db`) |

## Модулі

- **Адміністратор:** класи, предмети, користувачі, прив’язка батьків до дітей, розклад, події, аналітика
- **Вчитель:** журнал, домашні завдання, матеріали, тести, опитування, аналітика, розклад
- **Учень:** розклад, ДЗ, оцінки, матеріали, тести, опитування
- **Батько:** зведення по дитині, ДЗ, оцінки та відвідуваність, розклад, матеріали, результати тестів, календар, оголошення (кілька дітей — перемикач у шапці)
- **Спільне:** оголошення, сповіщення, календар, профіль; пошук — для адміна та вчителя

## Запуск

Потрібні **Node.js 20+** та **npm**.

```bash
# 1. Встановити залежності
cd "DIPLOM 3"
npm install
npm run install:all

# 2. База даних
cd backend
npx prisma generate
npx prisma db push
npm run db:seed

# 3. Запуск (з кореня проєкту)
cd ..
npm run dev
```

- Frontend: http://localhost:5173  
- Backend API: http://localhost:3001  

## Демо-облікові записи

Пароль для всіх: **password123**

| Роль | Email | Примітка |
|------|-------|----------|
| Адміністратор | admin@kuzgym.local | |
| Вчитель | teacher@kuzgym.local | Петренко — математика (усі класи 5–11) |
| Вчитель | teacher6@kuzgym.local | Іваненко — українська мова (усі класи) |
| Вчитель | teacher2@kuzgym.local | Шевченко — англійська, історія |
| Вчитель | teacher3@kuzgym.local | Кравець — географія, біологія |
| Вчитель | teacher4@kuzgym.local | Лисенко — фізика, хімія |
| Вчитель | teacher5@kuzgym.local | Бондаренко — інформатика |
| Учень | student1@kuzgym.local | 5-А (учень №1) |
| Учень | s6a3@kuzgym.local | 6-А, учень №3 |
| Учень | s11b5@kuzgym.local | 11-Б, учень №5 |
| Батько | parent@kuzgym.local | Діти: student1 (5-А) та учень 6-А |
| Батько | parent2@kuzgym.local | Дитина: 7-А |

**Класи в демо-БД:** 14 класів (5–11 паралель, **5-А**, **5-Б**, …, **11-А**, **11-Б**), у кожному **5 учнів** (разом 70). Email учня: `s{паралель}{а|b}{номер}@kuzgym.local`, напр. `s8b2@kuzgym.local`.

## Структура

```
DIPLOM 3/
├── backend/          # Express API + Prisma
├── frontend/         # React SPA
├── package.json      # concurrently dev
└── README.md
```

## Окремий запуск

```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev
```

## Production build

```bash
cd backend && npm run build && npm start
cd frontend && npm run build
```

Статику frontend (`frontend/dist`) можна віддавати через nginx або налаштувати proxy на API.

## Деплой (Railway + Vercel)

Детальна інструкція: **[DEPLOY.md](./DEPLOY.md)**

| Сервіс | Що деплоїть | Healthcheck |
|--------|-------------|-------------|
| **Railway** | `backend/` | `GET /api/health` |
| **Vercel** | `frontend/` | — |

Ключові змінні:
- Railway: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`
- Vercel: `VITE_API_URL=https://your-api.railway.app/api`
