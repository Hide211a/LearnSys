# Деплой: GitHub + Railway + Vercel

Монорепозиторій: **backend** → Railway, **frontend** → Vercel.

## 1. GitHub

```bash
git init
git add .
git commit -m "Initial commit: Kuzgym education platform"
git remote add origin https://github.com/YOUR_USER/kuzgym.git
git push -u origin main
```

Переконайтесь, що **не** потрапили в репозиторій:
- `backend/.env`, `frontend/.env`
- `*.db`, `node_modules/`, `dist/`

---

## 2. Railway (бекенд API)

### Налаштування сервісу

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. **Root Directory:** `backend`
3. Railway підхопить `railway.toml` (healthcheck `/api/health`)

### Змінні середовища

| Змінна | Значення |
|--------|----------|
| `DATABASE_URL` | `file:/data/kuzgym.db` (з volume, див. нижче) |
| `JWT_SECRET` | довгий випадковий рядок |
| `FRONTEND_URL` | `https://your-app.vercel.app` (після Vercel) |
| `NODE_ENV` | `production` |
| `RUN_SEED` | `true` — **лише для першого деплою**, потім видалити |

### Volume для SQLite (рекомендовано)

Без volume БД зникне після редеплою.

1. У сервісі Railway → **Volumes** → Add Volume
2. Mount path: `/data`
3. `DATABASE_URL=file:/data/kuzgym.db`

### Перше наповнення БД

Після успішного деплою (release command виконує `prisma db push`):

```bash
# через Railway CLI або одноразово RUN_SEED=true + Custom Command:
railway run npm run db:seed
```

Або в Dashboard → Settings → Deploy → Release Command тимчасово:
`npm run db:deploy && npm run db:seed`

### Healthcheck

Railway перевіряє `GET /api/health` → `{ "status": "ok", ... }`

Також доступні: `GET /health`

### Публічний URL

Settings → Networking → Generate Domain → скопіюйте, напр.  
`https://kuzgym-api-production.up.railway.app`

---

## 3. Vercel (фронтенд)

1. [vercel.com](https://vercel.com) → Import Git Repository
2. **Root Directory:** `frontend`
3. Framework Preset: **Vite** (підхопить `vercel.json`)

### Змінні середовища

| Змінна | Значення |
|--------|----------|
| `VITE_API_URL` | `https://YOUR-RAILWAY-DOMAIN.up.railway.app/api` |

⚠️ Без `/api` на кінці API не працюватиме.

4. Deploy

### SPA-маршрути

`vercel.json` перенаправляє всі шляхи на `index.html` (React Router).

---

## 4. Зв’язок фронт ↔ бек

1. У **Railway** встановіть `FRONTEND_URL` = URL Vercel (без слеша в кінці)
2. У **Vercel** встановіть `VITE_API_URL` = Railway URL + `/api`
3. Redeploy обидва сервіси після зміни env

---

## 5. Локальна розробка

```bash
# backend/.env
DATABASE_URL="file:./dev.db"
JWT_SECRET="local-dev-secret"

# frontend — .env не потрібен (proxy /api → localhost:3001)

npm run install:all
cd backend && npx prisma db push && npm run db:seed
cd .. && npm run dev
```

---

## 6. Чеклист перед захистом

- [ ] `GET https://api.../api/health` → `status: ok`
- [ ] Вхід з Vercel (демо `teacher@kuzgym.local` / `password123`)
- [ ] CORS: немає помилок у консолі браузера
- [ ] `JWT_SECRET` і `.env` не в Git
- [ ] БД на Railway з volume або PostgreSQL

---

## PostgreSQL (опційно, надійніше за SQLite)

1. Railway → Add PostgreSQL
2. Скопіюйте `DATABASE_URL` у змінні бекенду
3. У `backend/prisma/schema.prisma` змініть `provider` на `postgresql`
4. Redeploy + `railway run npm run db:seed`
