# Стратегія тестування HabitQuest

## Інструменти
- **Jest** — тестовий фреймворк
- **Supertest** — інтеграційне тестування HTTP
- **jest-junit** — генерація junit.xml для SonarCloud
- **lcov** — HTML звіти покриття

## Структура тестів
- `tests/unit/` — модульні тести з mock-об'єктами
- `tests/integration/` — інтеграційні тести через HTTP

## Правила генерації тестів
- Мокай зовнішні залежності (MongoDB, RabbitMQ) через jest.mock()
- Кожен repository метод має окремий unit test
- Кожен API endpoint має інтеграційний тест
- Тестуй happy path і edge cases (null, порожні масиви, невалідні дані)

## Звіти
- junit.xml → backend/reports/junit.xml
- lcov.info → backend/coverage/lcov.info
- HTML звіт → backend/coverage/index.html

## Запуск
- Локально: `npm test`
- З coverage: `npm run test:coverage`
- CI: `npm run test:ci`

## Мінімальні пороги
- Coverage загальний: 70%
- Coverage по файлу: бажано 60%+
