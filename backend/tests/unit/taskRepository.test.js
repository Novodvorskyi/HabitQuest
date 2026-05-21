jest.mock('../../models', () => ({
  Task: {
    find:              jest.fn(),
    findOne:           jest.fn(),
    create:            jest.fn(),
    findOneAndUpdate:  jest.fn(),
    findOneAndDelete:  jest.fn(),
  },
}));

const { Task } = require('../../models');
const TaskRepository = require('../../repositories/taskRepository');

beforeEach(() => jest.clearAllMocks());

describe('TaskRepository.findAllByUser()', () => {
  test('викликає find з userId і сортує по deadline', async () => {
    const sorted = { sort: jest.fn().mockResolvedValue([]) };
    Task.find.mockReturnValue(sorted);
    await TaskRepository.findAllByUser('user1');
    expect(Task.find).toHaveBeenCalledWith({ userId: 'user1' });
    expect(sorted.sort).toHaveBeenCalledWith({ deadline: 1 });
  });

  test('повертає масив завдань', async () => {
    const tasks = [{ _id: 't1', name: 'Лаба' }];
    Task.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(tasks) });
    const result = await TaskRepository.findAllByUser('user1');
    expect(result).toEqual(tasks);
  });
});

describe('TaskRepository.findOne()', () => {
  test('знаходить завдання за id і userId', async () => {
    Task.findOne.mockResolvedValue({ _id: 't1', name: 'Лаба' });
    const result = await TaskRepository.findOne('t1', 'user1');
    expect(Task.findOne).toHaveBeenCalledWith({ _id: 't1', userId: 'user1' });
    expect(result.name).toBe('Лаба');
  });

  test('повертає null якщо не знайдено', async () => {
    Task.findOne.mockResolvedValue(null);
    const result = await TaskRepository.findOne('bad', 'user1');
    expect(result).toBeNull();
  });
});

describe('TaskRepository.create()', () => {
  test('створює завдання з переданими даними', async () => {
    const data = { name: 'Курсова', userId: 'u1', difficulty: 'hard' };
    Task.create.mockResolvedValue({ _id: 't1', ...data });
    const result = await TaskRepository.create(data);
    expect(Task.create).toHaveBeenCalledWith(data);
    expect(result.name).toBe('Курсова');
  });
});

describe('TaskRepository.update()', () => {
  test('оновлює завдання і повертає нову версію', async () => {
    Task.findOneAndUpdate.mockResolvedValue({ _id: 't1', name: 'Оновлено' });
    const result = await TaskRepository.update('t1', 'u1', { name: 'Оновлено' });
    expect(Task.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 't1', userId: 'u1' }, { name: 'Оновлено' }, { new: true }
    );
    expect(result.name).toBe('Оновлено');
  });

  test('повертає null якщо не знайдено', async () => {
    Task.findOneAndUpdate.mockResolvedValue(null);
    const result = await TaskRepository.update('bad', 'u1', {});
    expect(result).toBeNull();
  });
});

describe('TaskRepository.delete()', () => {
  test('видаляє завдання', async () => {
    Task.findOneAndDelete.mockResolvedValue({ _id: 't1', name: 'Лаба' });
    const result = await TaskRepository.delete('t1', 'u1');
    expect(Task.findOneAndDelete).toHaveBeenCalledWith({ _id: 't1', userId: 'u1' });
    expect(result.name).toBe('Лаба');
  });

  test('повертає null якщо не знайдено', async () => {
    Task.findOneAndDelete.mockResolvedValue(null);
    const result = await TaskRepository.delete('bad', 'u1');
    expect(result).toBeNull();
  });
});

describe('TaskRepository.deleteAndReturn()', () => {
  test('видаляє і повертає завдання', async () => {
    Task.findOneAndDelete.mockResolvedValue({ _id: 't1', name: 'Лаба', difficulty: 'hard' });
    const result = await TaskRepository.deleteAndReturn('t1', 'u1');
    expect(Task.findOneAndDelete).toHaveBeenCalledWith({ _id: 't1', userId: 'u1' });
    expect(result.difficulty).toBe('hard');
  });

  test('повертає null якщо не знайдено', async () => {
    Task.findOneAndDelete.mockResolvedValue(null);
    const result = await TaskRepository.deleteAndReturn('bad', 'u1');
    expect(result).toBeNull();
  });
});
