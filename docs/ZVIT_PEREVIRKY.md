# Звіт перевірки платформи ЗЗСО «Кузьмівська гімназія»

**Дата:** 15.06.2026  
**Версія:** 1.0.0  
**Стек:** React 19 + Vite + MUI | Express + Prisma + SQLite  
**Мета:** аудит відповідності бекенду та фронтенду, опис тест-кейсів для кожного модуля.

---

## 1. Підсумок

| Критерій | Статус |
|----------|--------|
| `npm run build` (TypeScript) | ✅ Проходить |
| Prisma schema | ✅ Валідна |
| Автоматичні тести (Jest/Vitest) | ❌ Відсутні |
| Покриття ролей (ADMIN, TEACHER, STUDENT, PARENT) | ✅ Реалізовано |
| Захист API (JWT, перевірка ролей) | ✅ Базовий рівень |
| Відомі прогалини | Див. розділ 8 |

**Демо-пароль для всіх облікових записів:** `password123`

---

## 2. Інфраструктура

### 2.1 Запуск

| # | Тест | Очікуваний результат | Статус |
|---|------|----------------------|--------|
| I-01 | `npm run install:all` з кореня | Встановлюються залежності backend і frontend | Перевірити вручну |
| I-02 | `npm run db:push` + `npm run db:seed` | БД створена, 14 класів, 70 учнів, 6 вчителів | ✅ Seed OK |
| I-03 | `npm run dev` | Frontend http://localhost:5173, API http://localhost:3001 | ✅ |
| I-04 | `GET /api/health` | `{ status: "ok", school: "Кузьмівська гімназія" }` | Перевірити вручну |
| I-05 | Proxy Vite `/api` → `:3001` | Запити з фронту йдуть на бекенд без CORS-помилок | ✅ |

### 2.2 База даних (Prisma)

| Модель | Призначення |
|--------|-------------|
| User, ParentLink | Користувачі та зв’язок батько–дитина |
| SchoolYear, ClassGroup | Навчальні роки та класи 5–11 (А/Б) |
| Subject, TeacherAssignment | Предмети та призначення вчителів |
| ScheduleSlot | Розклад (день 1–5, урок 1–8) |
| LessonRecord | Журнал (оцінки, відвідуваність, тема) |
| Homework, HomeworkSubmission | ДЗ та здачі |
| HomeworkComment | Коментарі до ДЗ (**API є, UI немає**) |
| Announcement, Event, Notification | Оголошення, події, сповіщення |
| LessonMaterial, Quiz, Poll | Матеріали, тести, опитування |

---

## 3. BACKEND — детальні тест-кейси

### 3.1 Авторизація (`/api/auth`)

| # | Метод | Endpoint | Тест | Очікуваний результат |
|---|-------|----------|------|----------------------|
| A-01 | POST | `/login` | Валідний email + пароль | 200, `token`, об’єкт `user` |
| A-02 | POST | `/login` | Невірний пароль | 401 |
| A-03 | POST | `/login` | Невалідний email (без @) | 400 |
| A-04 | GET | `/me` | З Bearer-токеном | 200, дані користувача без passwordHash |
| A-05 | GET | `/me` | Без токена | 401 |
| A-06 | PATCH | `/profile` | Зміна ПІБ | 200, оновлені поля |
| A-07 | PATCH | `/profile` | Зміна пароля з невірним `currentPassword` | 400 |
| A-08 | PATCH | `/profile` | Зміна пароля з вірним поточним | 200 |

**Фронтенд:** `LoginPage.tsx`, `ProfilePage.tsx`, `AuthContext.tsx`

---

### 3.2 Адміністратор (`/api/admin`, роль ADMIN)

#### Панель

| # | Endpoint | Тест | Очікуваний результат |
|---|----------|------|----------------------|
| AD-01 | GET `/dashboard` | Під адміном | Статистика: користувачі, класи, події, нещодавня активність |
| AD-02 | GET `/dashboard` | Під вчителем | 403 |

**Фронтенд:** `AdminDashboard.tsx` → `/admin`

#### Навчальні роки

| # | Endpoint | Тест | Очікуваний результат |
|---|----------|------|----------------------|
| AD-10 | GET `/school-years` | Список років | Масив з `isCurrent` |
| AD-11 | POST `/school-years` | Створити рік | 201 |
| AD-12 | PATCH `/school-years/:id` | Встановити `isCurrent: true` | Інші роки стають непоточними |

**Фронтенд:** `AdminSchoolYears.tsx` → `/admin/school-years`

#### Класи

| # | Endpoint | Тест | Очікуваний результат |
|---|----------|------|----------------------|
| AD-20 | GET `/classes` | Список | 14 класів з grade, name, schoolYear |
| AD-21 | POST `/classes` | Створити `10-А` | 201 |
| AD-22 | PATCH `/classes/:id` | Змінити назву | 200 |
| AD-23 | DELETE `/classes/:id` | Видалити порожній клас | 204 |
| AD-24 | GET `/classes/:id/students` | Учні класу | Список, сорт. за прізвищем |
| AD-25 | POST `/classes/:id/students` | Додати нового учня | 201, email унікальний |
| AD-26 | POST `/classes/:id/students/assign` | Призначити існуючого | 200 |
| AD-27 | DELETE `/classes/:id/students/:userId` | Відкріпити учня | 204 |
| AD-28 | GET `/students/unassigned` | Учні без класу | Масив |

**Фронтенд:** `AdminClasses.tsx` → `/admin/classes`

#### Предмети

| # | Endpoint | Тест | Очікуваний результат |
|---|----------|------|----------------------|
| AD-30 | GET `/subjects` | Список | MATH, UKR, ENG тощо |
| AD-31 | POST `/subjects` | Дубль `code` | 400/500 помилка |
| AD-32 | PATCH `/subjects/:id` | Зміна назви | 200 |
| AD-33 | DELETE `/subjects/:id` | Предмет з прив’язками | Помилка (захист FK) |

**Фронтенд:** `AdminSubjects.tsx` → `/admin/subjects`

#### Користувачі

| # | Endpoint | Тест | Очікуваний результат |
|---|----------|------|----------------------|
| AD-40 | GET `/users?role=STUDENT` | Список учнів | Сорт: паралель → клас (А/Б) → ПІБ |
| AD-41 | GET `/users?role=TEACHER` | Список вчителів | З `taughtAssignments` |
| AD-42 | POST `/users` | Створити учня з класом | 201 |
| AD-43 | POST `/users` | Дубль email | Помилка |
| AD-44 | PATCH `/users/:id` | Зміна ПІБ, пароля | 200 |
| AD-45 | DELETE `/users/:id` | Видалення | 204 |
| AD-46 | GET `/users/:parentId/children` | Діти батька | Масив учнів |
| AD-47 | POST `/users/:parentId/children` | Прив’язати учня | 201 |
| AD-48 | DELETE `/users/:parentId/children/:childId` | Відв’язати | 204 |

**Фронтенд:** `AdminUsers.tsx` → `/admin/users` (вкладки Учні / Вчителі / Батьки / Адмін)

#### Призначення вчителів

| # | Endpoint | Тест | Очікуваний результат |
|---|----------|------|----------------------|
| AD-50 | GET `/assignments` | Усі призначення | teacher + subject + class |
| AD-51 | POST `/assignments` | Нова пара вчитель–предмет–клас | 201 |
| AD-52 | DELETE `/assignments/:id` | Видалити | 204 |

**Фронтенд:** `AdminAssignments.tsx` → `/admin/assignments`

#### Розклад (адмін)

| # | Endpoint | Тест | Очікуваний результат |
|---|----------|------|----------------------|
| AD-60 | GET `/schedule` | Усі слоти або `?classGroupId=` | Масив ScheduleSlot |
| AD-61 | POST `/schedule` | Новий урок | Перевірка конфліктів класу/вчителя |
| AD-62 | POST `/schedule` | Вчитель зайнятий у слоті | 400 помилка |
| AD-63 | POST `/schedule` | Вчитель без призначення на клас | 400 помилка |
| AD-64 | PATCH `/schedule/:id` | Зміна кабінету/часу | 200 |
| AD-65 | DELETE `/schedule/:id` | Видалити слот | 204 |

**Фронтенд:** `AdminSchedule.tsx` → `/admin/schedule` (вкладки по класах + «Усі класи»)

#### Події (адмін)

| # | Endpoint | Тест | Очікуваний результат |
|---|----------|------|----------------------|
| AD-70 | GET `/events` | Без фільтрів | `{ events, stats }` |
| AD-71 | GET `/events?type=holiday` | Лише канікули | Фільтр `isHoliday` |
| AD-72 | POST `/events` | Подія для класу | 201 |
| AD-73 | PATCH `/events/:id` | Редагування | 200 |
| AD-74 | DELETE `/events/:id` | Видалення | 204 |

**Фронтенд:** `AdminEvents.tsx` → `/admin/events`

#### Аналітика (адмін)

| # | Endpoint | Тест | Очікуваний результат |
|---|----------|------|----------------------|
| AD-80 | GET `/analytics` | Загальна | Огляд, графіки, учні під ризиком |
| AD-81 | GET `/analytics?classGroupId=` | По класу | Фільтровані дані |
| AD-82 | GET `/analytics?tab=teachers` | По вчителях | Статистика призначень |

**Фронтенд:** `AdminAnalytics.tsx` → `/admin/analytics`

---

### 3.3 Вчитель (`/api/teacher`, ролі TEACHER, ADMIN)

| # | Endpoint | Тест | Очікуваний результат |
|---|----------|------|----------------------|
| T-01 | GET `/dashboard` | Під `teacher@` | Зведення: класи, ДЗ на перевірку, уроки сьогодні |
| T-02 | GET `/schedule` | Розклад вчителя | Слоти де `teacherId` = поточний |
| T-03 | GET `/my-classes` | Призначені класи | Статистика по кожній парі клас–предмет |
| T-04 | GET `/journal?classGroupId&subjectId` | Свій клас+предмет | students + records |
| T-05 | GET `/journal` | Чужий клас (без призначення) | 403 |
| T-06 | POST `/journal` | Запис оцінки | 200, сповіщення учню |
| T-07 | POST `/journal/bulk` | Масове збереження | 200, однаковий клас/предмет |
| T-08 | GET `/homework` | Список ДЗ | Лише `teacherId` = поточний |
| T-09 | POST `/homework` | Без призначення на клас | 403 |
| T-10 | POST `/homework` | З призначенням | 201, submissions + сповіщення учням і батькам |
| T-11 | GET `/homework/:id/submissions` | Чуже ДЗ (інший teacherId) | 403 |
| T-12 | PATCH `/submissions/:id` | Оцінити / повернути | 200, `feedback`, сповіщення |
| T-13 | GET `/materials` | Без фільтра | Лише матеріали класів з призначень |
| T-14 | POST `/materials` | Чужий клас | 403 |
| T-15 | DELETE `/materials/:id` | Чужий матеріал | 403 |
| T-16 | GET/POST `/quizzes` | CRUD тестів | Лише свої тести |
| T-17 | GET `/analytics` | Аналітика | Середні бали, прострочені ДЗ по класах |

**Фронтенд:**

| Сторінка | Маршрут |
|----------|---------|
| TeacherDashboard | `/teacher` |
| TeacherClasses | `/teacher/classes` |
| TeacherSchedule | `/teacher/schedule` |
| TeacherJournal | `/teacher/journal` |
| TeacherHomework | `/teacher/homework` |
| TeacherMaterials | `/teacher/materials` |
| TeacherQuizzes | `/teacher/quizzes` |
| TeacherPolls | `/teacher/polls` |
| TeacherAnalytics | `/teacher/analytics` |

---

### 3.4 Учень (`/api/student`, роль STUDENT)

| # | Endpoint | Тест | Очікуваний результат |
|---|----------|------|----------------------|
| S-01 | GET `/dashboard` | `student1@` | Уроки сьогодні, ДЗ, оцінки, події |
| S-02 | GET `/schedule` | Розклад класу | Слоти 5-А |
| S-03 | GET `/homework` | ДЗ класу | `mySubmission`, `isOverdue` |
| S-04 | POST `/homework/:id/submit` | Здати текст | status SUBMITTED |
| S-05 | POST `/homework/:id/submit` | ДЗ іншого класу | 403 |
| S-06 | GET `/grades` | Оцінки + summary | Середні по предметах |
| S-07 | GET `/materials` | Матеріали класу | Список з предметами |
| S-08 | GET `/quizzes` | Тести класу | З attempts |
| S-09 | GET `/quizzes/:id` | Питання без відповідей | options без `isCorrect` |
| S-10 | POST `/quizzes/:id/attempt` | Пройти тест | score у % |
| S-11 | GET `/dashboard` | Під батьком без childId | 400 |

**Фронтенд:**

| Сторінка | Маршрут |
|----------|---------|
| StudentDashboard | `/student` |
| StudentSchedule | `/student/schedule` |
| StudentHomework | `/student/homework` |
| StudentGrades | `/student/grades` |
| StudentMaterials | `/student/materials` |
| StudentQuizzes | `/student/quizzes` |
| StudentPolls | `/student/polls` |

---

### 3.5 Батько (`/api/student` + `childId`, роль PARENT)

| # | Endpoint | Тест | Очікуваний результат |
|---|----------|------|----------------------|
| P-01 | GET `/children` | `parent@` | 2 дитини (5-А, 6-А) |
| P-02 | GET `/children-summary` | Картки зведення | summary + alertCount |
| P-03 | GET `/dashboard?childId=` | Детальне зведення | alerts, tasks |
| P-04 | GET `/dashboard?childId=` | Чужий childId | 403 |
| P-05 | GET `/homework?childId=` | ДЗ дитини | read-only |
| P-06 | GET `/grades?childId=` | Оцінки + відвідуваність | Таблиця + графік |
| P-07 | GET `/schedule?childId=` | Розклад дитини | ScheduleGrid |
| P-08 | GET `/materials?childId=` | Матеріали | Список |
| P-09 | GET `/quizzes?childId=` | Результати тестів | Лише score, без проходження |
| P-10 | POST `/homework/:id/submit` | Спроба здати від імені дитини | 403 (лише STUDENT) |

**Фронтенд:**

| Сторінка | Маршрут |
|----------|---------|
| ParentDashboard | `/parent` |
| ParentHomework | `/parent/homework` |
| ParentGrades | `/parent/grades` (+ друк звіту) |
| ParentSchedule | `/parent/schedule` |
| ParentMaterials | `/parent/materials` |
| ParentQuizzes | `/parent/quizzes` |
| ChildSelector | Шапка + поля на сторінках |

---

### 3.6 Спільні маршрути (`/api`)

| # | Endpoint | Тест | Очікуваний результат |
|---|----------|------|----------------------|
| C-01 | GET `/announcements` | Учень | Глобальні + класові |
| C-02 | GET `/announcements` | Батько | Глобальні + класи дітей |
| C-03 | POST `/announcements` | Вчитель | 201, сповіщення класу + батькам |
| C-04 | POST `/announcements` | Учень | 403 |
| C-05 | GET `/events` | Учень | Шкільні + класові |
| C-06 | GET `/events?childId=` | Батько | Події класу дитини |
| C-07 | GET `/notifications` | Будь-яка роль | Останні 50 |
| C-08 | PATCH `/notifications/:id/read` | Позначити прочитаним | 200 |
| C-09 | GET `/polls` | Учень | Лише опитування свого класу |
| C-10 | POST `/polls/:id/vote` | Учень | 200 |
| C-11 | POST `/polls/:id/vote` | Батько | 403 |
| C-12 | GET `/search?q=` | Адмін | Користувачі + предмети + ДЗ |
| C-13 | GET `/search?q=` | Батько | Лише свої діти + ДЗ класів дітей |
| C-14 | GET `/homework/:id/comments` | Учень свого класу | 200 |
| C-15 | POST `/homework/:id/comments` | Порожній текст | 400 |
| C-16 | GET `/homework/:id/comments` | Чужий клас | 403 |

**Фронтенд:** `AnnouncementsPage`, `EventsPage`, `NotificationBell`, `Layout` (пошук)

---

## 4. FRONTEND — покрокові сценарії UI

### 4.1 Вхід і навігація

| # | Сценарій | Кроки | Очікуваний результат |
|---|----------|-------|----------------------|
| UI-01 | Вхід адміна | Login → admin@ / password123 | Редірект на `/admin` |
| UI-02 | Вхід вчителя | teacher@ | `/teacher`, меню вчителя |
| UI-03 | Вхід учня | student1@ | `/student` |
| UI-04 | Вхід батька | parent@ | `/parent`, селектор дитини |
| UI-05 | Захист маршрутів | Учень відкриває `/admin` | Редірект на `/` |
| UI-06 | Вихід | Кнопка logout | `/login`, токен видалено |
| UI-07 | 401 expired | Прострочений токен | Автовихід на login |

### 4.2 Адміністратор (9 розділів)

Для кожного розділу: відкрити сторінку → перевірити завантаження даних → виконати CRUD → перевірити toast/оновлення списку.

| Розділ | Ключові тести UI |
|--------|------------------|
| Панель | Лічильники збігаються з БД; посилання на підрозділи працюють |
| Навч. рік | Створити рік; зробити поточним |
| Класи | Додати учня; призначити існуючого; видалити з класу |
| Предмети | CRUD; унікальний code |
| Користувачі | Пошук ПІБ/email; учні в порядку 5-А→11-Б; прив’язка дітей до батька |
| Призначення | Додати/видалити вчитель–предмет–клас |
| Розклад | Сітка по класу; конфлікт показує помилку |
| Події | Вкладки події/канікули; фільтр; редагування |
| Аналітика | Вкладки огляд/класи/вчителі; графіки рендеряться |

### 4.3 Вчитель (9 розділів)

| Розділ | Ключові тести UI |
|--------|------------------|
| Панель | Кількість ДЗ на перевірку; швидкі посилання |
| Мої класи | Картки класів; перехід до журналу |
| Розклад | Тижнева сітка; уроки сьогодні |
| Журнал | Вибір класу/предмета; виставити оцінку; відвідуваність |
| ДЗ | Створити; переглянути здачі; оцінити; feedback |
| Матеріали | Додати посилання; список лише своїх класів |
| Тести | Створити з питаннями SINGLE/MULTIPLE |
| Опитування | Створити; графік голосів |
| Аналітика | Середні бали; прострочені ДЗ |

### 4.4 Учень (7 розділів)

| Розділ | Ключові тести UI |
|--------|------------------|
| Панель | Уроки сьогодні; блок «Зверніть увагу» |
| Розклад | ScheduleGrid з кабінетами |
| ДЗ | Вкладки активні/здані/прострочені; здати текст |
| Оцінки | Картки середніх; графік; фільтр предмета |
| Матеріали | Фільтр; посилання відкриваються |
| Тести | Пройти; побачити результат % |
| Опитування | Проголосувати; лічильник голосів |

### 4.5 Батько (8 розділів)

| Розділ | Ключові тести UI |
|--------|------------------|
| Зведення | 2 картки дітей; перемикання; alerts |
| ДЗ | Статуси дитини; feedback вчителя (не здача) |
| Оцінки | Друк звіту; відвідуваність |
| Розклад | Розклад обраної дитини |
| Матеріали | Матеріали класу дитини |
| Тести | Результати % (read-only) |
| Оголошення | Класові + глобальні |
| Календар | Події з childId |

### 4.6 Спільні компоненти

| Компонент | Тест |
|-----------|------|
| Layout | Меню відповідає ролі; активний пункт підсвічений |
| NotificationBell | Непрочитані; клік → перехід по link |
| ChildSelector | 2+ дітей — dropdown; 1 дитина — текст |
| ScheduleGrid | Коректні дні Пн–Пт |
| ProtectedRoute | Блокування чужих ролей |

---

## 5. Безпека

| # | Перевірка | Статус |
|---|-----------|--------|
| SEC-01 | JWT на всіх захищених маршрутах | ✅ |
| SEC-02 | `requireRoles` на admin/teacher | ✅ |
| SEC-03 | `parentLink` для childId | ✅ |
| SEC-04 | Вчитель — лише свої ДЗ/submissions | ✅ |
| SEC-05 | Вчитель — матеріали лише своїх класів | ✅ |
| SEC-06 | Журнал — лише свої призначення | ✅ |
| SEC-07 | Пошук обмежений за роллю | ✅ |
| SEC-08 | Опитування — голос лише учень | ✅ |
| SEC-09 | CORS лише localhost | ⚠️ Для prod потрібні інші origin |
| SEC-10 | `HomeworkComment` API без UI | ⚠️ API готовий, екрану немає |
| SEC-11 | `GET /teacher/quizzes/:id` — без перевірки власника | ⚠️ Дрібний ризик (лише teacher route) |

---

## 6. Демо-облікові записи для тестування

| Email | Роль | Що перевіряти |
|-------|------|----------------|
| admin@kuzgym.local | ADMIN | Усі розділи адмінки |
| teacher@kuzgym.local | TEACHER | Математика, усі класи |
| teacher6@kuzgym.local | TEACHER | Українська мова |
| teacher2@kuzgym.local | TEACHER | Англійська, історія (8+) |
| student1@kuzgym.local | STUDENT | 5-А |
| s6a3@kuzgym.local | STUDENT | 6-А, учень №3 |
| s11b5@kuzgym.local | STUDENT | 11-Б |
| parent@kuzgym.local | PARENT | Діти: student1 + 6-А |
| parent2@kuzgym.local | PARENT | Дитина: 7-А |

---

## 7. Матриця «Backend ↔ Frontend»

| API модуль | Frontend сторінка | Зв’язок |
|------------|-------------------|---------|
| auth | Login, Profile | ✅ |
| admin/* | Admin* (9 сторінок) | ✅ |
| teacher/* | Teacher* (9 сторінок) | ✅ |
| student/* | Student* (7 сторінок) | ✅ |
| student/* + childId | Parent* (6 сторінок) | ✅ |
| announcements, events | Announcements, Events | ✅ |
| notifications | NotificationBell | ✅ |
| polls | TeacherPolls, StudentPolls | ✅ |
| homework/comments | — | ❌ Немає UI |
| search | Layout (admin/teacher) | ✅ |

---

## 8. Відомі прогалини та рекомендації

| Пріоритет | Проблема | Рекомендація |
|-----------|----------|--------------|
| Середній | Немає UI для `HomeworkComment` | Додати блок коментарів у TeacherHomework / StudentHomework |
| Середній | Немає автотестів | Vitest + Supertest для критичних API |
| Низький | Великий JS-бандл (~3.5 MB) | Code-splitting по ролях |
| Низький | CORS localhost only | Налаштувати для деплою |
| Низький | `fileUrl` у submission | UI для завантаження файлів (зараз лише текст) |
| Низький | Дубль сортування учнів | Лишити тільки на backend |

---

## 9. Чеклист швидкої приймальної перевірки (15 хв)

1. [ ] `npm run build` — без помилок  
2. [ ] Login admin → dashboard з даними  
3. [ ] Admin Users → учні відсортовані по класах  
4. [ ] teacher@ → створити ДЗ для 5-А → student1 бачить  
5. [ ] student1 здає ДЗ → teacher оцінює → parent бачить feedback  
6. [ ] parent@ перемикає дітей → різні дані  
7. [ ] Оголошення для класу → батько бачить  
8. [ ] Student polls → голос → лічильник змінюється  
9. [ ] Notification bell → клік по сповіщенню  
10. [ ] Logout → не можна відкрити `/admin` без login  

---

*Звіт згенеровано на основі аналізу коду та збірки проєкту. Для захисту диплому рекомендується пройти чеклист розділу 9 вручну та зберегти скріншоти.*
