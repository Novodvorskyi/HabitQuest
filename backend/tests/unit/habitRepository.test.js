jest.mock('../../models', () => ({
  Habit: {
    find:              jest.fn(),
    findOne:           jest.fn(),
    create:            jest.fn(),
    findOneAndUpdate:  jest.fn(),
    findOneAndDelete:  jest.fn(),
  },
}));

const { Habit } = require('../../models');
const HabitRepository = require('../../repositories/habitRepository');

beforeEach(() => jest.clearAllMocks());

describe('HabitRepository.findAllByUser()', () => {
  test('викликає find з userId і сортує по createdAt', async () => {
    const sorted = { sort: jest.fn().mockResolvedValue([]) };
    Habit.find.mockReturnValue(sorted);
    await HabitRepository.findAllByUser('user1');
    expect(Habit.find).toHaveBeenCalledWith({ userId: 'user1' });
    expect(sorted.sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  test('повертає масив звичок', async () => {
    const habits = [{ _id: 'h1', name: 'Читання' }];
    Habit.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(habits) });
    const result = await HabitRepository.findAllByUser('user1');
    expect(result).toEqual(habits);
  });
});

describe('HabitRepository.findOne()', () => {
  test('знаходить звичку за id і userId', async () => {
    Habit.findOne.mockResolvedValue({ _id: 'h1', name: 'Йога' });
    const result = await HabitRepository.findOne('h1', 'user1');
    expect(Habit.findOne).toHaveBeenCalledWith({ _id: 'h1', userId: 'user1' });
    expect(result.name).toBe('Йога');
  });

  test('повертає null якщо не знайдено', async () => {
    Habit.findOne.mockResolvedValue(null);
    const result = await HabitRepository.findOne('bad', 'user1');
    expect(result).toBeNull();
  });
});

describe('HabitRepository.create()', () => {
  test('створює звичку з переданими даними', async () => {
    const data = { name: 'Спорт', userId: 'u1', difficulty: 'hard' };
    Habit.create.mockResolvedValue({ _id: 'h1', ...data });
    const result = await HabitRepository.create(data);
    expect(Habit.create).toHaveBeenCalledWith(data);
    expect(result.name).toBe('Спорт');
  });
});

describe('HabitRepository.update()', () => {
  test('оновлює звичку і повертає нову версію', async () => {
    Habit.findOneAndUpdate.mockResolvedValue({ _id: 'h1', name: 'Оновлено' });
    const result = await HabitRepository.update('h1', 'u1', { name: 'Оновлено' });
    expect(Habit.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'h1', userId: 'u1' }, { name: 'Оновлено' }, { new: true }
    );
    expect(result.name).toBe('Оновлено');
  });

  test('повертає null якщо не знайдено', async () => {
    Habit.findOneAndUpdate.mockResolvedValue(null);
    const result = await HabitRepository.update('bad', 'u1', {});
    expect(result).toBeNull();
  });
});

describe('HabitRepository.delete()', () => {
  test('видаляє звичку за id і userId', async () => {
    Habit.findOneAndDelete.mockResolvedValue({ _id: 'h1', name: 'Читання' });
    const result = await HabitRepository.delete('h1', 'u1');
    expect(Habit.findOneAndDelete).toHaveBeenCalledWith({ _id: 'h1', userId: 'u1' });
    expect(result.name).toBe('Читання');
  });

  test('повертає null якщо не знайдено', async () => {
    Habit.findOneAndDelete.mockResolvedValue(null);
    const result = await HabitRepository.delete('bad', 'u1');
    expect(result).toBeNull();
  });
});
