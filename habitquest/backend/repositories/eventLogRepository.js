/* ═══════════════════════════════════
   repositories/eventLogRepository.js
═══════════════════════════════════ */

const { EventLog } = require('../models');

const EventLogRepository = {
  findByUser: (userId, limit = 100) =>
    EventLog.find({ userId }).sort({ createdAt: -1 }).limit(limit),

  create: (data) =>
    EventLog.create(data),
};

module.exports = EventLogRepository;
