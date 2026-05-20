/* ═══════════════════════════════════
   repositories/taskRepository.js
═══════════════════════════════════ */

const { Task } = require('../models');

const TaskRepository = {
  findAllByUser: (userId) =>
    Task.find({ userId }).sort({ deadline: 1 }),

  findOne: (id, userId) =>
    Task.findOne({ _id: id, userId }),

  create: (data) =>
    Task.create(data),

  update: (id, userId, data) =>
    Task.findOneAndUpdate({ _id: id, userId }, data, { new: true }),

  delete: (id, userId) =>
    Task.findOneAndDelete({ _id: id, userId }),

  deleteAndReturn: (id, userId) =>
    Task.findOneAndDelete({ _id: id, userId }),
};

module.exports = TaskRepository;
