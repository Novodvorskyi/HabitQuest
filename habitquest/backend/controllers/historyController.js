/* ═══════════════════════════════════
   controllers/historyController.js
═══════════════════════════════════ */

const EventLogRepository = require('../repositories/eventLogRepository');

/**
 * @swagger
 * /api/history:
 *   get:
 *     summary: Журнал подій користувача
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список подій (до 100)
 */
async function getHistory(req, res) {
  try {
    const logs = await EventLogRepository.findByUser(req.user.id, 100);
    res.json(logs);
  } catch (e) { res.status(500).json({ message: e.message }); }
}

module.exports = { getHistory };
