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

describe('UserRepository.findById()', () => {
  test('викликає findById з правильним id', async () => {
    User.findById.mockResolvedValue({ _id: 'u1', nickname: 'Test' });
    const result = await UserRepository.findById('u1');
    expect(User.findById).toHaveBeenCalledWith('u1');
    expect(result.nickname).toBe('Test');
  });

  test('повертає null якщо не знайдено', async () => {
    User.findById.mockResolvedValue(null);
    const result = await UserRepository.findById('bad');
    expect(result).toBeNull();
  });
});

describe('UserRepository.findByNicknameExcept()', () => {
  test('шукає з виключенням id', async () => {
    User.findOne.mockResolvedValue(null);
    await UserRepository.findByNicknameExcept('Nick', 'excludeId');
    expect(User.findOne).toHaveBeenCalledWith({
      nickname: 'Nick', _id: { $ne: 'excludeId' }
    });
  });
});

describe('UserRepository.incrementStat()', () => {
  test('інкрементує поле на 1', async () => {
    User.findByIdAndUpdate.mockResolvedValue(true);
    await UserRepository.incrementStat('u1', 'totalTasksDone');
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      'u1', { $inc: { totalTasksDone: 1 } }
    );
  });
});

describe('UserRepository.setActiveFrame()', () => {
  test('встановлює activeFrame', async () => {
    User.updateOne.mockResolvedValue({ modifiedCount: 1 });
    await UserRepository.setActiveFrame('u1', 'gold');
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: 'u1' }, { $set: { activeFrame: 'gold' } }
    );
  });
});

describe('UserRepository.searchByNickname()', () => {
  test('шукає за regex і виключає поточного користувача', async () => {
    const limited = { limit: jest.fn().mockResolvedValue([]) };
    User.find.mockReturnValue(limited);
    await UserRepository.searchByNickname('test', 'u1');
    expect(User.find).toHaveBeenCalledWith({
      _id: { $ne: 'u1' },
      nickname: { $regex: 'test', $options: 'i' }
    });
    expect(limited.limit).toHaveBeenCalledWith(10);
  });
});

describe('UserRepository.addFollowing()', () => {
  test('додає в following і followers одночасно', async () => {
    User.updateOne.mockResolvedValue({ modifiedCount: 1 });
    await UserRepository.addFollowing('myId', 'targetId');
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: 'myId' }, { $addToSet: { following: 'targetId' } }
    );
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: 'targetId' }, { $addToSet: { followers: 'myId' } }
    );
  });
});

describe('UserRepository.removeFollowing()', () => {
  test('видаляє з following і followers', async () => {
    User.updateOne.mockResolvedValue({ modifiedCount: 1 });
    await UserRepository.removeFollowing('myId', 'targetObjId', 'targetId', 'myObjId');
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: 'myId' }, { $pull: { following: 'targetObjId' } }
    );
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: 'targetId' }, { $pull: { followers: 'myObjId' } }
    );
  });
});
