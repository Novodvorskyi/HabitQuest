/* ═══════════════════════════════════
   controllers/shopController.js
═══════════════════════════════════ */

const UserRepository = require('../repositories/userRepository');
const { publish }    = require('../broker');
const { FRAMES }     = require('../config/constants');
const { safeUser }   = require('./authController');

/**
 * @swagger
 * /api/shop/frames:
 *   get:
 *     summary: Отримати всі рамки магазину
 *     tags: [Shop]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список рамок
 */
function getFrames(req, res) {
  res.json(FRAMES);
}

/**
 * @swagger
 * /api/shop/buy/{frameId}:
 *   post:
 *     summary: Купити рамку
 *     tags: [Shop]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: frameId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Рамку куплено, повертає оновленого користувача
 *       400:
 *         description: Недостатньо монет / рівня / вже куплено
 */
async function buyFrame(req, res) {
  try {
    const frame = FRAMES.find(f => f.id === req.params.frameId);
    if (!frame) return res.status(404).json({ message: 'Рамку не знайдено' });

    const user = await UserRepository.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Користувача не знайдено' });

    if (user.level < frame.level)
      return res.status(400).json({ message: `Потрібен рівень ${frame.level}` });
    if ((user.ownedFrames || []).includes(frame.id))
      return res.status(400).json({ message: 'Рамку вже куплено' });
    if (user.coins < frame.price)
      return res.status(400).json({ message: `Не вистачає монет (потрібно ${frame.price}🪙, є ${user.coins}🪙)` });

    await UserRepository.addFrame(req.user.id, frame.id, frame.price);
    await publish('shop.purchased', {
      userId: String(user._id), frameName: frame.name, price: frame.price,
    });

    const updated = await UserRepository.findById(req.user.id);
    res.json(safeUser(updated));
  } catch (e) {
    console.error('[buyFrame]', e.message);
    res.status(500).json({ message: e.message });
  }
}

/**
 * @swagger
 * /api/shop/equip/{frameId}:
 *   post:
 *     summary: Надіти / зняти рамку
 *     tags: [Shop]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: frameId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Рамку надіто або знято
 */
async function equipFrame(req, res) {
  try {
    const frame = FRAMES.find(f => f.id === req.params.frameId);
    if (!frame) return res.status(404).json({ message: 'Рамку не знайдено' });

    const user = await UserRepository.findById(req.user.id);
    if (!(user.ownedFrames || []).includes(frame.id))
      return res.status(400).json({ message: 'Рамку не куплено' });

    const newActive = user.activeFrame === frame.id ? '' : frame.id;
    await UserRepository.setActiveFrame(req.user.id, newActive);
    await publish('shop.equipped', {
      userId: String(user._id), frameName: frame.name, frameId: frame.id,
    });

    const updated = await UserRepository.findById(req.user.id);
    res.json(safeUser(updated));
  } catch (e) {
    console.error('[equipFrame]', e.message);
    res.status(500).json({ message: e.message });
  }
}

module.exports = { getFrames, buyFrame, equipFrame };
