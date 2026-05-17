/* ═══════════════════════════════════════════════════
   tests/integration/api.test.js
   Покриття 80%+
═══════════════════════════════════════════════════ */

jest.mock('mongoose', () => {
  const real = jest.requireActual('mongoose');
  real.connect = jest.fn().mockResolvedValue(true);
  return real;
});
jest.mock('../../broker', () => ({
  connect:   jest.fn().mockResolvedValue(true),
  publish:   jest.fn().mockResolvedValue(true),
  subscribe: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../services', () => ({
  startAllServices: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../repositories/userRepository');
jest.mock('../../repositories/habitRepository');
jest.mock('../../repositories/taskRepository');
jest.mock('../../repositories/eventLogRepository');

const request            = require('supertest');
const bcrypt             = require('bcryptjs');
const UserRepository     = require('../../repositories/userRepository');
const HabitRepository    = require('../../repositories/habitRepository');
const TaskRepository     = require('../../repositories/taskRepository');
const EventLogRepository = require('../../repositories/eventLogRepository');

let app;
beforeAll(() => {
  process.env.JWT_SECRET   = 'test_secret_key';
  process.env.MONGO_URI    = 'mongodb://localhost/test';
  process.env.RABBITMQ_URL = 'amqp://localhost';
  app = require('../../server');
});
beforeEach(() => jest.clearAllMocks());

/* ══ Helpers ══ */
function fakeUser(overrides = {}) {
  return {
    _id: 'uid123', nickname: 'TestPlayer',
    avatar: '', bio: '',
    xp: 100, level: 2, coins: 200, streak: 3,
    totalTasksDone: 5, totalHabitsDone: 10,
    ownedFrames: ['silver'], activeFrame: 'silver',
    following: [], followers: [],
    lastDate: new Date().toISOString().slice(0, 10),
    ...overrides,
  };
}

async function getToken(nickname = 'TestPlayer') {
  const hash = await bcrypt.hash('pass1234', 10);
  UserRepository.findByNickname.mockResolvedValue(fakeUser({ passwordHash: hash, nickname }));
  UserRepository.updateById.mockResolvedValue(true);
  const res = await request(app)
    .post('/api/auth/login')
    .send({ nickname, password: 'pass1234' });
  return res.body.token;
}

/* ════════════════════════
   AUTH
════════════════════════ */
describe('POST /api/auth/register', () => {
  test('успішна реєстрація', async () => {
    UserRepository.findByNickname.mockResolvedValue(null);
    UserRepository.create.mockResolvedValue(fakeUser({ nickname: 'NewPlayer' }));
    const res = await request(app).post('/api/auth/register')
      .send({ nickname: 'NewPlayer', password: 'pass1234' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.nickname).toBe('NewPlayer');
  });

  test('нікнейм вже зайнятий', async () => {
    UserRepository.findByNickname.mockResolvedValue(fakeUser());
    const res = await request(app).post('/api/auth/register')
      .send({ nickname: 'TestPlayer', password: 'pass1234' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('вже зайнятий');
  });

  test('порожні поля', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Заповни всі поля');
  });

  test('пароль менше 4 символів', async () => {
    UserRepository.findByNickname.mockResolvedValue(null);
    const res = await request(app).post('/api/auth/register')
      .send({ nickname: 'Player', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('мінімум 4');
  });

  test('нікнейм менше 2 символів', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ nickname: 'A', password: 'pass1234' });
    expect(res.status).toBe(400);
  });

  test('лише пароль без нікнейму', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ password: 'pass1234' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  test('успішний вхід', async () => {
    const token = await getToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);
  });

  test('невірний пароль', async () => {
    const hash = await bcrypt.hash('correct', 10);
    UserRepository.findByNickname.mockResolvedValue(fakeUser({ passwordHash: hash }));
    const res = await request(app).post('/api/auth/login')
      .send({ nickname: 'TestPlayer', password: 'wrong' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Невірний');
  });

  test('користувача не існує', async () => {
    UserRepository.findByNickname.mockResolvedValue(null);
    const res = await request(app).post('/api/auth/login')
      .send({ nickname: 'Nobody', password: 'pass' });
    expect(res.status).toBe(400);
  });

  test('порожні поля при вході', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Заповни всі поля');
  });
});

/* ════════════════════════
   USER
════════════════════════ */
describe('GET /api/user/me', () => {
  test('повертає поточного користувача', async () => {
    const token = await getToken();
    UserRepository.findById.mockResolvedValue(fakeUser());
    const res = await request(app).get('/api/user/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.nickname).toBe('TestPlayer');
    expect(res.body).toHaveProperty('xp');
    expect(res.body).toHaveProperty('level');
    expect(res.body).toHaveProperty('coins');
  });

  test('401 без токена', async () => {
    const res = await request(app).get('/api/user/me');
    expect(res.status).toBe(401);
  });

  test('404 якщо користувача не знайдено', async () => {
    const token = await getToken();
    UserRepository.findById.mockResolvedValue(null);
    const res = await request(app).get('/api/user/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/user/profile', () => {
  test('оновлює нікнейм і bio', async () => {
    const token = await getToken();
    UserRepository.findByNicknameExcept.mockResolvedValue(null);
    UserRepository.updateById.mockResolvedValue(true);
    UserRepository.findById.mockResolvedValue(fakeUser({ nickname: 'NewNick', bio: 'Hello!' }));
    const res = await request(app).put('/api/user/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ nickname: 'NewNick', bio: 'Hello!' });
    expect(res.status).toBe(200);
    expect(res.body.nickname).toBe('NewNick');
    expect(res.body.bio).toBe('Hello!');
  });

  test('помилка якщо новий нікнейм зайнятий', async () => {
    const token = await getToken();
    UserRepository.findByNicknameExcept.mockResolvedValue(fakeUser({ nickname: 'TakenNick' }));
    const res = await request(app).put('/api/user/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ nickname: 'TakenNick' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('вже зайнятий');
  });

  test('оновлює аватарку (base64)', async () => {
    const token = await getToken();
    UserRepository.findByNicknameExcept.mockResolvedValue(null);
    UserRepository.updateById.mockResolvedValue(true);
    UserRepository.findById.mockResolvedValue(fakeUser({ avatar: 'data:image/png;base64,abc' }));
    const res = await request(app).put('/api/user/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ avatar: 'data:image/png;base64,abc' });
    expect(res.status).toBe(200);
    expect(res.body.avatar).toBe('data:image/png;base64,abc');
  });

  test('401 без токена', async () => {
    const res = await request(app).put('/api/user/profile').send({ nickname: 'X' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/users/search', () => {
  test('знаходить користувачів за нікнеймом', async () => {
    const token = await getToken();
    UserRepository.searchByNickname.mockResolvedValue([
      fakeUser({ _id: 'other1', nickname: 'Player2' }),
      fakeUser({ _id: 'other2', nickname: 'Player3' }),
    ]);
    const res = await request(app).get('/api/users/search?q=Player')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  test('повертає порожній масив якщо запит менше 2 символів', async () => {
    const token = await getToken();
    const res = await request(app).get('/api/users/search?q=A')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  test('повертає порожній масив без параметра q', async () => {
    const token = await getToken();
    const res = await request(app).get('/api/users/search')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  test('401 без токена', async () => {
    const res = await request(app).get('/api/users/search?q=test');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/users/following', () => {
  test('повертає список підписок', async () => {
    const token = await getToken();
    UserRepository.findWithFollowing.mockResolvedValue({
      following: [
        fakeUser({ _id: 'f1', nickname: 'Friend1' }),
        fakeUser({ _id: 'f2', nickname: 'Friend2' }),
      ],
    });
    const res = await request(app).get('/api/users/following')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('повертає порожній масив якщо немає підписок', async () => {
    const token = await getToken();
    UserRepository.findWithFollowing.mockResolvedValue({ following: [] });
    const res = await request(app).get('/api/users/following')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

describe('POST /api/users/:id/follow', () => {
  test('успішна підписка', async () => {
    const token = await getToken();
    UserRepository.findById
      .mockResolvedValueOnce(fakeUser({ following: [] }))
      .mockResolvedValueOnce(fakeUser({ _id: 'target123', nickname: 'Target' }));
    UserRepository.isFollowing.mockReturnValue(false);
    UserRepository.addFollowing.mockResolvedValue(true);
    const res = await request(app).post('/api/users/target123/follow')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.following).toBe(true);
    expect(res.body.message).toContain('Підписались');
  });

  test('успішна відписка', async () => {
    const token = await getToken();
    UserRepository.findById
      .mockResolvedValueOnce(fakeUser({ following: ['target123'] }))
      .mockResolvedValueOnce(fakeUser({ _id: 'target123', nickname: 'Target' }));
    UserRepository.isFollowing.mockReturnValue(true);
    UserRepository.removeFollowing.mockResolvedValue(true);
    const res = await request(app).post('/api/users/target123/follow')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.following).toBe(false);
    expect(res.body.message).toContain('Відписались');
  });

  test('не можна підписатись на себе', async () => {
    const token = await getToken();
    const res = await request(app).post('/api/users/uid123/follow')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('себе');
  });

  test('404 якщо цільовий користувач не існує', async () => {
    const token = await getToken();
    UserRepository.findById
      .mockResolvedValueOnce(fakeUser())
      .mockResolvedValueOnce(null);
    const res = await request(app).post('/api/users/nonexistent/follow')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

/* ════════════════════════
   HABITS
════════════════════════ */
describe('GET /api/habits', () => {
  test('повертає список звичок', async () => {
    const token = await getToken();
    HabitRepository.findAllByUser.mockResolvedValue([
      { _id: 'h1', name: 'Читання', difficulty: 'easy', frequency: 'daily' },
      { _id: 'h2', name: 'Спорт',   difficulty: 'hard', frequency: 'daily' },
    ]);
    const res = await request(app).get('/api/habits')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('401 без токена', async () => {
    const res = await request(app).get('/api/habits');
    expect(res.status).toBe(401);
  });

  test('повертає порожній масив якщо немає звичок', async () => {
    const token = await getToken();
    HabitRepository.findAllByUser.mockResolvedValue([]);
    const res = await request(app).get('/api/habits')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

describe('POST /api/habits', () => {
  test('створює звичку', async () => {
    const token = await getToken();
    HabitRepository.create.mockResolvedValue(
      { _id: 'h1', name: 'Читання', difficulty: 'easy', frequency: 'daily' }
    );
    const res = await request(app).post('/api/habits')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Читання', difficulty: 'easy', frequency: 'daily' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Читання');
  });

  test('помилка без назви', async () => {
    const token = await getToken();
    const res = await request(app).post('/api/habits')
      .set('Authorization', `Bearer ${token}`)
      .send({ difficulty: 'easy' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Назва');
  });

  test('створює звичку з weekdays', async () => {
    const token = await getToken();
    HabitRepository.create.mockResolvedValue(
      { _id: 'h2', name: 'Йога', difficulty: 'medium', frequency: 'custom', weekdays: [1, 3, 5] }
    );
    const res = await request(app).post('/api/habits')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Йога', difficulty: 'medium', frequency: 'custom', weekdays: [1, 3, 5] });
    expect(res.status).toBe(201);
    expect(res.body.weekdays).toEqual([1, 3, 5]);
  });
});

describe('PUT /api/habits/:id', () => {
  test('оновлює звичку', async () => {
    const token = await getToken();
    HabitRepository.update.mockResolvedValue(
      { _id: 'h1', name: 'Читання (ред.)', difficulty: 'medium' }
    );
    const res = await request(app).put('/api/habits/h1')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Читання (ред.)', difficulty: 'medium' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Читання (ред.)');
  });

  test('404 якщо не знайдено', async () => {
    const token = await getToken();
    HabitRepository.update.mockResolvedValue(null);
    const res = await request(app).put('/api/habits/bad_id')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/habits/:id', () => {
  test('видаляє звичку', async () => {
    const token = await getToken();
    HabitRepository.delete.mockResolvedValue({ name: 'Читання' });
    const res = await request(app).delete('/api/habits/h1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Видалено');
  });

  test('404 якщо не знайдено', async () => {
    const token = await getToken();
    HabitRepository.delete.mockResolvedValue(null);
    const res = await request(app).delete('/api/habits/bad_id')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/habits/:id/complete', () => {
  test('виконує звичку', async () => {
    const token = await getToken();
    HabitRepository.findOne.mockResolvedValue(
      { _id: 'h1', name: 'Читання', difficulty: 'easy' }
    );
    UserRepository.incrementStat.mockResolvedValue(true);
    const res = await request(app).post('/api/habits/h1/complete')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('OK');
  });

  test('404 якщо звичку не знайдено', async () => {
    const token = await getToken();
    HabitRepository.findOne.mockResolvedValue(null);
    const res = await request(app).post('/api/habits/bad_id/complete')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

/* ════════════════════════
   TASKS
════════════════════════ */
describe('GET /api/tasks', () => {
  test('повертає список завдань', async () => {
    const token = await getToken();
    TaskRepository.findAllByUser.mockResolvedValue([
      { _id: 't1', name: 'Здати лабу', difficulty: 'hard' },
    ]);
    const res = await request(app).get('/api/tasks')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe('Здати лабу');
  });

  test('401 без токена', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/tasks', () => {
  test('створює завдання', async () => {
    const token = await getToken();
    TaskRepository.create.mockResolvedValue(
      { _id: 't1', name: 'Здати лабу', difficulty: 'hard' }
    );
    const res = await request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Здати лабу', difficulty: 'hard' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Здати лабу');
  });

  test('створює завдання з дедлайном', async () => {
    const token = await getToken();
    const deadline = '2025-12-31T23:59:00';
    TaskRepository.create.mockResolvedValue(
      { _id: 't2', name: 'Курсова', difficulty: 'hard', deadline }
    );
    const res = await request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Курсова', difficulty: 'hard', deadline });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Курсова');
  });

  test('помилка без назви', async () => {
    const token = await getToken();
    const res = await request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ difficulty: 'easy' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/tasks/:id', () => {
  test('оновлює завдання', async () => {
    const token = await getToken();
    TaskRepository.update.mockResolvedValue(
      { _id: 't1', name: 'Оновлено', difficulty: 'medium' }
    );
    const res = await request(app).put('/api/tasks/t1')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Оновлено', difficulty: 'medium' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Оновлено');
  });

  test('404 якщо не знайдено', async () => {
    const token = await getToken();
    TaskRepository.update.mockResolvedValue(null);
    const res = await request(app).put('/api/tasks/bad_id')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/tasks/:id', () => {
  test('видаляє завдання', async () => {
    const token = await getToken();
    TaskRepository.delete.mockResolvedValue({ name: 'Здати лабу' });
    const res = await request(app).delete('/api/tasks/t1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Видалено');
  });

  test('404 якщо не знайдено', async () => {
    const token = await getToken();
    TaskRepository.delete.mockResolvedValue(null);
    const res = await request(app).delete('/api/tasks/bad_id')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/tasks/:id/complete', () => {
  test('виконує і видаляє завдання', async () => {
    const token = await getToken();
    TaskRepository.deleteAndReturn.mockResolvedValue(
      { _id: 't1', name: 'Здати лабу', difficulty: 'hard' }
    );
    UserRepository.incrementStat.mockResolvedValue(true);
    const res = await request(app).post('/api/tasks/t1/complete')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('OK');
  });

  test('404 якщо завдання не існує', async () => {
    const token = await getToken();
    TaskRepository.deleteAndReturn.mockResolvedValue(null);
    const res = await request(app).post('/api/tasks/bad/complete')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

/* ════════════════════════
   SHOP
════════════════════════ */
describe('GET /api/shop/frames', () => {
  test('повертає всі рамки', async () => {
    const token = await getToken();
    const res = await request(app).get('/api/shop/frames')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(8);
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0]).toHaveProperty('price');
    expect(res.body[0]).toHaveProperty('level');
  });

  test('401 без токена', async () => {
    const res = await request(app).get('/api/shop/frames');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/shop/buy/:frameId', () => {
  test('успішна купівля рамки', async () => {
    const token = await getToken();
    UserRepository.findById
      .mockResolvedValueOnce(fakeUser({ level: 2, coins: 500, ownedFrames: [] }))
      .mockResolvedValueOnce(fakeUser({ level: 2, coins: 400, ownedFrames: ['gold'] }));
    UserRepository.addFrame.mockResolvedValue(true);
    const res = await request(app).post('/api/shop/buy/gold')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ownedFrames).toContain('gold');
  });

  test('недостатньо монет', async () => {
    const token = await getToken();
    UserRepository.findById.mockResolvedValue(
      fakeUser({ level: 5, coins: 10, ownedFrames: [] })
    );
    const res = await request(app).post('/api/shop/buy/gold')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('монет');
  });

  test('недостатній рівень', async () => {
    const token = await getToken();
    UserRepository.findById.mockResolvedValue(
      fakeUser({ level: 1, coins: 9999, ownedFrames: [] })
    );
    const res = await request(app).post('/api/shop/buy/rainbow')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('рівень');
  });

  test('рамку вже куплено', async () => {
    const token = await getToken();
    UserRepository.findById.mockResolvedValue(
      fakeUser({ level: 5, coins: 999, ownedFrames: ['gold'] })
    );
    const res = await request(app).post('/api/shop/buy/gold')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('вже куплено');
  });

  test('рамку не знайдено', async () => {
    const token = await getToken();
    const res = await request(app).post('/api/shop/buy/nonexistent')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('404 якщо користувача не знайдено', async () => {
    const token = await getToken();
    UserRepository.findById.mockResolvedValue(null);
    const res = await request(app).post('/api/shop/buy/silver')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/shop/equip/:frameId', () => {
  test('надіває рамку', async () => {
    const token = await getToken();
    UserRepository.findById
      .mockResolvedValueOnce(fakeUser({ ownedFrames: ['gold'], activeFrame: '' }))
      .mockResolvedValueOnce(fakeUser({ ownedFrames: ['gold'], activeFrame: 'gold' }));
    UserRepository.setActiveFrame.mockResolvedValue(true);
    const res = await request(app).post('/api/shop/equip/gold')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.activeFrame).toBe('gold');
  });

  test('знімає активну рамку', async () => {
    const token = await getToken();
    UserRepository.findById
      .mockResolvedValueOnce(fakeUser({ ownedFrames: ['gold'], activeFrame: 'gold' }))
      .mockResolvedValueOnce(fakeUser({ ownedFrames: ['gold'], activeFrame: '' }));
    UserRepository.setActiveFrame.mockResolvedValue(true);
    const res = await request(app).post('/api/shop/equip/gold')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.activeFrame).toBe('');
  });

  test('рамку не куплено', async () => {
    const token = await getToken();
    UserRepository.findById.mockResolvedValue(fakeUser({ ownedFrames: [] }));
    const res = await request(app).post('/api/shop/equip/gold')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('не куплено');
  });

  test('рамку не знайдено у списку', async () => {
    const token = await getToken();
    const res = await request(app).post('/api/shop/equip/nonexistent')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

/* ════════════════════════
   HISTORY
════════════════════════ */
describe('GET /api/history', () => {
  test('повертає журнал подій', async () => {
    const token = await getToken();
    EventLogRepository.findByUser.mockResolvedValue([
      { icon: '✓', action: 'Завдання виконано', detail: '"Здати лабу"', xp: 25, coins: 12 },
      { icon: '◉', action: 'Звичку виконано',   detail: '"Читання"',    xp: 10, coins: 5  },
    ]);
    const res = await request(app).get('/api/history')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].xp).toBe(25);
  });

  test('повертає порожній масив якщо немає подій', async () => {
    const token = await getToken();
    EventLogRepository.findByUser.mockResolvedValue([]);
    const res = await request(app).get('/api/history')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  test('401 без токена', async () => {
    const res = await request(app).get('/api/history');
    expect(res.status).toBe(401);
  });
});
