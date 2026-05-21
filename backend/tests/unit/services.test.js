jest.mock('../../broker', () => ({
  connect:   jest.fn().mockResolvedValue(true),
  publish:   jest.fn().mockResolvedValue(true),
  subscribe: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../models', () => ({
  User: {
    findByIdAndUpdate: jest.fn(),
    findById:          jest.fn(),
  },
  EventLog: {
    create: jest.fn().mockResolvedValue(true),
  },
}));

const broker              = require('../../broker');
const { User, EventLog }  = require('../../models');
const { startAllServices } = require('../../services');

beforeEach(() => jest.clearAllMocks());

async function callSubscribeHandler(callIndex, routingKey, payload) {
  const [, , handler] = broker.subscribe.mock.calls[callIndex];
  await handler(routingKey, payload);
}

describe('startAllServices()', () => {
  test('запускає всі три сервіси', async () => {
    await startAllServices();
    expect(broker.subscribe).toHaveBeenCalledTimes(3);
  });
});

describe('XPService handler', () => {
  beforeEach(() => startAllServices());

  test('нараховує XP і монети для easy', async () => {
    User.findByIdAndUpdate.mockResolvedValue({ _id: '1', login: 'user', xp: 110, coins: 10 });
    await callSubscribeHandler(0, 'item.completed', { userId: '1', difficulty: 'easy', type: 'task' });
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      '1', { $inc: { xp: 10, coins: 5 } }, { new: true }
    );
    expect(broker.publish).toHaveBeenCalledWith('xp.updated', expect.objectContaining({ userId: '1', xpGain: 10 }));
  });

  test('нараховує XP і монети для hard', async () => {
    User.findByIdAndUpdate.mockResolvedValue({ _id: '1', login: 'user', xp: 150, coins: 30 });
    await callSubscribeHandler(0, 'item.completed', { userId: '1', difficulty: 'hard', type: 'habit' });
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      '1', { $inc: { xp: 50, coins: 25 } }, { new: true }
    );
  });

  test('не публікує якщо user не знайдено', async () => {
    User.findByIdAndUpdate.mockResolvedValue(null);
    await callSubscribeHandler(0, 'item.completed', { userId: 'bad', difficulty: 'easy', type: 'task' });
    expect(broker.publish).not.toHaveBeenCalled();
  });

  test('використовує дефолтні значення для невідомої складності', async () => {
    User.findByIdAndUpdate.mockResolvedValue({ _id: '1', login: 'u', xp: 10, coins: 5 });
    await callSubscribeHandler(0, 'item.completed', { userId: '1', difficulty: 'unknown', type: 'task' });
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      '1', { $inc: { xp: 10, coins: 5 } }, { new: true }
    );
  });
});

describe('LevelService handler', () => {
  beforeEach(() => startAllServices());

  test('підвищує рівень якщо XP достатньо', async () => {
    const user = { _id: '1', login: 'u', level: 1, save: jest.fn().mockResolvedValue(true) };
    User.findById.mockResolvedValue(user);
    await callSubscribeHandler(1, 'xp.updated', { userId: '1', xp: 100 });
    expect(user.level).toBe(2);
    expect(user.save).toHaveBeenCalled();
    expect(broker.publish).toHaveBeenCalledWith('level.up', expect.objectContaining({ oldLevel: 1, newLevel: 2 }));
  });

  test('не підвищує рівень якщо XP недостатньо', async () => {
    const user = { _id: '1', login: 'u', level: 1, save: jest.fn() };
    User.findById.mockResolvedValue(user);
    await callSubscribeHandler(1, 'xp.updated', { userId: '1', xp: 50 });
    expect(user.save).not.toHaveBeenCalled();
  });

  test('не робить нічого якщо user не знайдено', async () => {
    User.findById.mockResolvedValue(null);
    await callSubscribeHandler(1, 'xp.updated', { userId: 'bad', xp: 500 });
    expect(broker.publish).not.toHaveBeenCalled();
  });
});

describe('LogService handler', () => {
  beforeEach(() => startAllServices());

  const cases = [
    ['item.completed', { userId: '1', type: 'task',  difficulty: 'easy', itemName: 'Лаба' },  '✓'],
    ['item.completed', { userId: '1', type: 'habit', difficulty: 'hard', itemName: 'Йога' },  '◉'],
    ['item.created',   { userId: '1', type: 'task',  itemName: 'Нова' },                      '＋'],
    ['item.created',   { userId: '1', type: 'habit', itemName: 'Звичка' },                    '＋'],
    ['item.deleted',   { userId: '1', type: 'task',  itemName: 'Стара' },                     '✕'],
    ['item.deleted',   { userId: '1', type: 'habit', itemName: 'Звичка' },                    '✕'],
    ['level.up',       { userId: '1', oldLevel: 1, newLevel: 2 },                             '🏆'],
    ['user.followed',  { userId: '1', targetNickname: 'Friend' },                             '👤'],
    ['user.unfollowed',{ userId: '1', targetNickname: 'Friend' },                             '👤'],
    ['shop.purchased', { userId: '1', frameName: 'gold', price: 100 },                        '🛒'],
    ['shop.equipped',  { userId: '1', frameName: 'gold' },                                    '✨'],
  ];

  test.each(cases)('логує подію %s', async (routingKey, payload, expectedIcon) => {
    await callSubscribeHandler(2, routingKey, payload);
    expect(EventLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ icon: expectedIcon, userId: '1' })
    );
  });
});
