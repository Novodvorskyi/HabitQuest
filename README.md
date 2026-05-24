# HabitQuest — Трекер звичок із гейміфікацією

> Веб-застосунок для відстеження звичок та завдань з системою XP, рівнів, монет і магазином рамок. Побудований на подієво-орієнтованій архітектурі з брокером повідомлень RabbitMQ.

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Novodvorskyi_HabitQuest&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Novodvorskyi_HabitQuest)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=Novodvorskyi_HabitQuest&metric=coverage)](https://sonarcloud.io/summary/new_code?id=Novodvorskyi_HabitQuest)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=Novodvorskyi_HabitQuest&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=Novodvorskyi_HabitQuest)

---

## Автор

- **ПІБ**: Новодворський Роман Володимирович
- **Група**: ФеП-32
- **Керівник**: Шувар Роман Ярославович, завідувач кафедри системного проектування
- **Спеціальність**: 121 — Інженерія програмного забезпечення

---

## Стек технологій

| Шар | Технологія |
|-----|-----------|
| Frontend | HTML, CSS, Vanilla JS |
| Backend | Node.js, Express.js |
| База даних | MongoDB (Mongoose ODM) |
| Брокер подій | RabbitMQ (topic exchange) |
| Автентифікація | JWT + bcrypt |
| Документація API | Swagger (OpenAPI 3.0) |
| Тести | Jest + Supertest |
| Контейнеризація | Docker, Docker Compose |
| CI/CD | GitHub Actions + SonarCloud |

---

## Структура проєкту

```
habitquest/
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── backend/
│   ├── server.js              ← Точка входу, маршрути
│   ├── broker.js              ← RabbitMQ підключення
│   ├── services.js            ← Сервіси-підписники подій
│   ├── models.js              ← Mongoose схеми
│   ├── Dockerfile
│   ├── package.json
│   ├── .env
│   │
│   ├── config/
│   │   └── constants.js       ← XP, монети, рівні, рамки
│   │
│   ├── middleware/
│   │   └── auth.js            ← JWT middleware
│   │
│   ├── controllers/           ← Обробники HTTP запитів
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── habitController.js
│   │   ├── taskController.js
│   │   ├── shopController.js
│   │   └── historyController.js
│   │
│   ├── repositories/          ← Шар доступу до даних
│   │   ├── userRepository.js
│   │   ├── habitRepository.js
│   │   ├── taskRepository.js
│   │   └── eventLogRepository.js
│   │
│   └── tests/
│       ├── unit/
│       │   ├── constants.test.js
│       │   ├── userRepository.test.js
│       │   ├── habitRepository.test.js
│       │   ├── taskRepository.test.js
│       │   ├── broker.test.js
│       │   └── services.test.js
│       └── integration/
│           └── api.test.js
│
├── docs/
│   └── diagrams/              ← UML діаграми
│
├── .github/
│   └── workflows/
│       └── ci.yml             ← GitHub Actions CI/CD
│
├── sonar-project.properties   ← SonarCloud конфігурація
├── docker-compose.yml
└── README.md
```

---

## Якість коду (SonarCloud)

| Метрика | Значення |
|---------|---------|
| Coverage | 85%+ |
| Tests | 200+ |
| Bugs & Vulnerabilities | 0 |
| Code Smells | A |
| Duplications | 0% |

---

## Архітектура подій (RabbitMQ)

```
HTTP Request
    │
    ▼
Controller ──► publish(event) ──► RabbitMQ Exchange
                                  (habitquest.exchange)
                                        │
              ┌─────────────────────────┼──────────────────┐
              │                         │                  │
    xp_service_queue         level_service_queue   log_service_queue
              │                         │                  │
         XPService              LevelService          LogService
         +XP +Coins          перевіряє рівень      пише в eventlogs
              │                         │
        publish(xp.updated)    publish(level.up)
```

### Черги та події

| Черга | Сервіс | Слухає події |
|-------|--------|-------------|
| `xp_service_queue` | XPService | `item.completed` |
| `level_service_queue` | LevelService | `xp.updated` |
| `log_service_queue` | LogService | `item.completed`, `item.created`, `item.deleted`, `level.up`, `user.followed`, `user.unfollowed`, `shop.purchased`, `shop.equipped` |

---

## Запуск

### Варіант 1 — Docker (рекомендовано)

```bash
# Запускає MongoDB + RabbitMQ + Backend одночасно
docker-compose up -d

# Перевірити логи
docker-compose logs -f backend
```

### Варіант 2 — Локально

**Потрібно встановити:**
- [Node.js 20 LTS](https://nodejs.org)
- [MongoDB Community](https://www.mongodb.com/try/download/community)
- [RabbitMQ](https://www.rabbitmq.com/install-windows.html) + [Erlang](https://www.erlang.org/downloads)

```bash
# 1. Встанови залежності
cd backend
npm install

# 2. Створи .env файл
# (вміст дивись нижче)

# 3. Запусти
npm run dev
```

### Вміст .env

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/habitquest
JWT_SECRET=supersecretkey123
RABBITMQ_URL=amqp://localhost
CORS_ORIGIN=http://localhost:3000
```

---

## API Документація

Після запуску backend відкрий у браузері:

**http://localhost:5000/api-docs**

### Короткий огляд ендпоінтів

| Метод | Шлях | Опис |
|-------|------|------|
| POST | `/api/auth/register` | Реєстрація |
| POST | `/api/auth/login` | Вхід |
| GET | `/api/user/me` | Поточний користувач |
| PUT | `/api/user/profile` | Оновити профіль |
| GET | `/api/habits` | Список звичок |
| POST | `/api/habits` | Створити звичку |
| PUT | `/api/habits/:id` | Оновити звичку |
| DELETE | `/api/habits/:id` | Видалити звичку |
| POST | `/api/habits/:id/complete` | Виконати звичку |
| GET | `/api/tasks` | Список завдань |
| POST | `/api/tasks` | Створити завдання |
| PUT | `/api/tasks/:id` | Оновити завдання |
| DELETE | `/api/tasks/:id` | Видалити завдання |
| POST | `/api/tasks/:id/complete` | Виконати завдання (видаляється) |
| GET | `/api/shop/frames` | Рамки магазину |
| POST | `/api/shop/buy/:frameId` | Купити рамку |
| POST | `/api/shop/equip/:frameId` | Надіти рамку |
| GET | `/api/users/search` | Пошук гравців |
| POST | `/api/users/:id/follow` | Підписатись/відписатись |
| GET | `/api/history` | Журнал подій |

---

## Тести

```bash
cd backend

# Запустити всі тести
npm test

# Тести з покриттям коду
npm run test:coverage

# CI режим (з junit.xml звітом)
npm run test:ci
```

Тести не потребують запущеної MongoDB або RabbitMQ — всі зовнішні залежності замокані.

### Структура тестів

| Файл | Тип | Що тестує |
|------|-----|-----------|
| `tests/integration/api.test.js` | Інтеграційний | Всі HTTP ендпоінти |
| `tests/unit/constants.test.js` | Модульний | XP, монети, рівні, рамки |
| `tests/unit/userRepository.test.js` | Модульний | UserRepository методи |
| `tests/unit/habitRepository.test.js` | Модульний | HabitRepository методи |
| `tests/unit/taskRepository.test.js` | Модульний | TaskRepository методи |
| `tests/unit/broker.test.js` | Модульний | RabbitMQ обгортка |
| `tests/unit/services.test.js` | Модульний | XP/Level/Log сервіси |

---

## Система гейміфікації

### XP та монети за виконання

| Складність | XP | Монети |
|------------|----|----|
| 🟢 Легка | 10 | 5🪙 |
| 🟡 Середня | 25 | 12🪙 |
| 🔴 Важка | 50 | 25🪙 |

### Рівні

| Рівень | Потрібно XP |
|--------|------------|
| 1 | 0 |
| 2 | 100 |
| 3 | 250 |
| 4 | 500 |
| 5 | 900 |
| 6 | 1400 |
| 7 | 2100 |
| 8 | 3000 |
| 9 | 4200 |
| 10 | 6000 |

### Рамки магазину

| Рамка | Рівень | Ціна |
|-------|--------|------|
| Срібна | 1 | 50🪙 |
| Золота | 2 | 100🪙 |
| Смарагдова | 3 | 180🪙 |
| Рубінова | 4 | 280🪙 |
| Сапфірова | 5 | 400🪙 |
| Фіолетова | 6 | 550🪙 |
| Райдужна | 8 | 900🪙 |
| Обсидіанова | 10 | 1500🪙 |

---

## CI/CD

При кожному `git push` GitHub Actions автоматично:
1. Встановлює Node.js 20
2. Запускає `npm install`
3. Запускає всі тести та генерує coverage звіт
4. Завантажує HTML/XML артефакти (доступні для завантаження 30 днів)
5. При push в `main` — відправляє результати в SonarCloud

### Артефакти після кожного запуску

- `coverage-html-report.zip` — HTML звіт покриття з візуальним відображенням непокритих рядків
- `junit-xml-report.zip` — JUnit XML звіт для інтеграції з SonarCloud

### Branch Protection

Гілка `main` захищена — PR не можна злити якщо:
- Pipeline червоний
- Quality Gate провалено (coverage < 70%)
