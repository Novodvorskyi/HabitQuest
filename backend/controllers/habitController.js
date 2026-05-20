/* ═══════════════════════════════════
   controllers/habitController.js
═══════════════════════════════════ */

const HabitRepository = require('../repositories/habitRepository');
const UserRepository  = require('../repositories/userRepository');
const { publish }     = require('../broker');

/**
 * @swagger
 * /api/habits:
 *   get:
 *     summary: Отримати всі звички користувача
 *     tags: [Habits]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список звичок
 */
async function getAll(req, res) {
  try {
    const habits = await HabitRepository.findAllByUser(req.user.id);
    res.json(habits);
  } catch (e) { res.status(500).json({ message: e.message }); }
}

/**
 * @swagger
 * /api/habits:
 *   post:
 *     summary: Створити нову звичку
 *     tags: [Habits]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *               frequency:
 *                 type: string
 *                 enum: [daily, weekly, custom]
 *               weekdays:
 *                 type: array
 *                 items:
 *                   type: number
 *     responses:
 *       201:
 *         description: Звичку створено
 *       400:
 *         description: Назва є обов'язковою
 */
async function create(req, res) {
  try {
    const { name, description, difficulty, frequency, weekdays } = req.body;
    if (!name) return res.status(400).json({ message: 'Назва є обов\'язковою' });
    const habit = await HabitRepository.create({
      userId: req.user.id, name, description, difficulty, frequency, weekdays,
    });
    await publish('item.created', { userId: req.user.id, itemName: name, type: 'habit' });
    res.status(201).json(habit);
  } catch (e) { res.status(500).json({ message: e.message }); }
}

/**
 * @swagger
 * /api/habits/{id}:
 *   put:
 *     summary: Оновити звичку
 *     tags: [Habits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Оновлена звичка
 *       404:
 *         description: Не знайдено
 */
async function update(req, res) {
  try {
    const habit = await HabitRepository.update(req.params.id, req.user.id, req.body);
    if (!habit) return res.status(404).json({ message: 'Не знайдено' });
    res.json(habit);
  } catch (e) { res.status(500).json({ message: e.message }); }
}

/**
 * @swagger
 * /api/habits/{id}:
 *   delete:
 *     summary: Видалити звичку
 *     tags: [Habits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Видалено
 *       404:
 *         description: Не знайдено
 */
async function remove(req, res) {
  try {
    const habit = await HabitRepository.delete(req.params.id, req.user.id);
    if (!habit) return res.status(404).json({ message: 'Не знайдено' });
    await publish('item.deleted', { userId: req.user.id, itemName: habit.name, type: 'habit' });
    res.json({ message: 'Видалено' });
  } catch (e) { res.status(500).json({ message: e.message }); }
}

/**
 * @swagger
 * /api/habits/{id}/complete:
 *   post:
 *     summary: Відмітити звичку як виконану
 *     tags: [Habits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Подію опубліковано в брокер
 */
async function complete(req, res) {
  try {
    const habit = await HabitRepository.findOne(req.params.id, req.user.id);
    if (!habit) return res.status(404).json({ message: 'Не знайдено' });
    await UserRepository.incrementStat(req.user.id, 'totalHabitsDone');
    await publish('item.completed', {
      userId: String(req.user.id),
      itemName: habit.name,
      difficulty: habit.difficulty,
      type: 'habit',
    });
    res.json({ message: 'OK' });
  } catch (e) { res.status(500).json({ message: e.message }); }
}

module.exports = { getAll, create, update, remove, complete };
