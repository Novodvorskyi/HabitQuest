/* ═══════════════════════════════════
   repositories/habitRepository.js
═══════════════════════════════════ */

const { Habit } = require('../models');

const HabitRepository = {
  findAllByUser: (userId) =>
    Habit.find({ userId }).sort({ createdAt: -1 }),

  findOne: (id, userId) =>
    Habit.findOne({ _id: id, userId }),

  create: (data) =>
    Habit.create(data),

  update: (id, userId, data) =>
    Habit.findOneAndUpdate({ _id: id, userId }, data, { new: true }),

  delete: (id, userId) =>
    Habit.findOneAndDelete({ _id: id, userId }),
};

module.exports = HabitRepository;
