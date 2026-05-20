/* ═══════════════════════════════════
   controllers/taskController.js
═══════════════════════════════════ */

const TaskRepository = require('../repositories/taskRepository');
const UserRepository = require('../repositories/userRepository');
const { publish }    = require('../broker');

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Отримати всі завдання користувача
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список завдань
 */
async function getAll(req, res) {
  try {
    res.json(await TaskRepository.findAllByUser(req.user.id));
  } catch (e) { res.status(500).json({ message: e.message }); }
}

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Створити завдання
 *     tags: [Tasks]
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
 *               deadline:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Завдання створено
 */
async function create(req, res) {
  try {
    const { name, description, difficulty, deadline } = req.body;
    if (!name) return res.status(400).json({ message: 'Назва є обов\'язковою' });
    const task = await TaskRepository.create({
      userId: req.user.id, name, description, difficulty, deadline: deadline || null,
    });
    await publish('item.created', { userId: req.user.id, itemName: name, type: 'task' });
    res.status(201).json(task);
  } catch (e) { res.status(500).json({ message: e.message }); }
}

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Оновити завдання
 *     tags: [Tasks]
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
 *         description: Оновлене завдання
 */
async function update(req, res) {
  try {
    const task = await TaskRepository.update(req.params.id, req.user.id, req.body);
    if (!task) return res.status(404).json({ message: 'Не знайдено' });
    res.json(task);
  } catch (e) { res.status(500).json({ message: e.message }); }
}

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Видалити завдання
 *     tags: [Tasks]
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
 */
async function remove(req, res) {
  try {
    const task = await TaskRepository.delete(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ message: 'Не знайдено' });
    await publish('item.deleted', { userId: req.user.id, itemName: task.name, type: 'task' });
    res.json({ message: 'Видалено' });
  } catch (e) { res.status(500).json({ message: e.message }); }
}

/**
 * @swagger
 * /api/tasks/{id}/complete:
 *   post:
 *     summary: Виконати завдання (видаляється після виконання)
 *     tags: [Tasks]
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
 *         description: Завдання виконано і видалено
 */
async function complete(req, res) {
  try {
    const task = await TaskRepository.deleteAndReturn(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ message: 'Не знайдено' });
    await UserRepository.incrementStat(req.user.id, 'totalTasksDone');
    await publish('item.completed', {
      userId: String(req.user.id),
      itemName: task.name,
      difficulty: task.difficulty,
      type: 'task',
    });
    res.json({ message: 'OK' });
  } catch (e) { res.status(500).json({ message: e.message }); }
}

module.exports = { getAll, create, update, remove, complete };
