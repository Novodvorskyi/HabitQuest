/* ═══════════════════════════════════════════════════
   tests/unit/userRepository.test.js
   Тести логіки репозиторію (без реальної БД — моки)
═══════════════════════════════════════════════════ */

/* Мокаємо модель User щоб не потрібна була MongoDB */
jest.mock('../../models', () => ({
  User: {
    findById:       jest.fn(),
    findOne:        jest.fn(),
    create:         jest.fn(),
    updateOne:      jest.fn(),
    findByIdAndUpdate: jest.fn(),
    find:           jest.fn(),
  },
}));

const { User } = require('../../models');
const UserRepository = require('../../repositories/userRepository');

beforeEach(() => jest.clearAllMocks());

describe('UserRepository.findByNickname()', () => {
  test('викликає findOne з правильними параметрами', async () => {
    User.findOne.mockResolvedValue({ nickname: 'TestUser' });
    await UserRepository.findByNickname('TestUser');
    expect(User.findOne).toHaveBeenCalledWith({ nickname: 'TestUser' });
  });

  test('повертає null якщо не знайдено', async () => {
    User.findOne.mockResolvedValue(null);
    const result = await UserRepository.findByNickname('Unknown');
    expect(result).toBeNull();
  });

  test('обрізає пробіли у нікнеймі', async () => {
    User.findOne.mockResolvedValue(null);
    await UserRepository.findByNickname('  TestUser  ');
    expect(User.findOne).toHaveBeenCalledWith({ nickname: 'TestUser' });
  });
});

describe('UserRepository.create()', () => {
  test('викликає User.create з переданими даними', async () => {
    const data = { nickname: 'Player1', passwordHash: 'hash123' };
    User.create.mockResolvedValue({ _id: '123', ...data });
    const result = await UserRepository.create(data);
    expect(User.create).toHaveBeenCalledWith(data);
    expect(result.nickname).toBe('Player1');
  });
});

describe('UserRepository.updateById()', () => {
  test('викликає updateOne з $set', async () => {
    User.updateOne.mockResolvedValue({ modifiedCount: 1 });
    await UserRepository.updateById('userId123', { streak: 5 });
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: 'userId123' },
      { $set: { streak: 5 } }
    );
  });
});

describe('UserRepository.isFollowing()', () => {
  test('повертає true якщо підписаний', () => {
    const me = { following: ['user1', 'user2', 'user3'] };
    expect(UserRepository.isFollowing(me, 'user2')).toBe(true);
  });

  test('повертає false якщо не підписаний', () => {
    const me = { following: ['user1'] };
    expect(UserRepository.isFollowing(me, 'user99')).toBe(false);
  });

  test('повертає false якщо following порожній', () => {
    const me = { following: [] };
    expect(UserRepository.isFollowing(me, 'user1')).toBe(false);
  });

  test('повертає false якщо following відсутній', () => {
    const me = {};
    expect(UserRepository.isFollowing(me, 'user1')).toBe(false);
  });
});

describe('UserRepository.addXpAndCoins()', () => {
  test('викликає findByIdAndUpdate з $inc', async () => {
    User.findByIdAndUpdate.mockResolvedValue({ xp: 110, coins: 15 });
    await UserRepository.addXpAndCoins('userId', 10, 5);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      'userId',
      { $inc: { xp: 10, coins: 5 } },
      { new: true }
    );
  });
});

describe('UserRepository.addFrame()', () => {
  test('знімає монети і додає рамку', async () => {
    User.updateOne.mockResolvedValue({ modifiedCount: 1 });
    await UserRepository.addFrame('userId', 'gold', 100);
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: 'userId' },
      { $inc: { coins: -100 }, $push: { ownedFrames: 'gold' } }
    );
  });
});
