# Архітектура HabitQuest

## Загальний підхід
Подієво-орієнтована архітектура (Event-Driven) з поділом на шари.

## Шари
- **controllers/** — HTTP обробники, валідація вхідних даних
- **repositories/** — доступ до даних, інкапсуляція MongoDB запитів
- **services/** — підписники RabbitMQ, бізнес-логіка нарахування XP/монет
- **models/** — Mongoose схеми
- **middleware/** — JWT автентифікація
- **broker.js** — обгортка над RabbitMQ (topic exchange)

## Потік даних
HTTP Request → Controller → Repository → MongoDB
Controller → publish(event) → RabbitMQ → Service → Repository

## Патерни
- **Repository Pattern** — repositories/ ізолюють доступ до БД
- **Middleware Pattern** — auth.js перевіряє JWT перед кожним захищеним маршрутом
- **Observer Pattern** — сервіси підписуються на події через RabbitMQ

## Заборони
- Контролери не імпортують моделі напряму
- Сервіси не обробляють HTTP запити
- Repositories не містять бізнес-логіку
