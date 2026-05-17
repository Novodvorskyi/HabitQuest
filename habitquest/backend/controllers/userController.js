/* ═══════════════════════════════════
   controllers/userController.js
═══════════════════════════════════ */

const UserRepository = require('../repositories/userRepository');
const { publish }    = require('../broker');
const { safeUser }   = require('./authController');

/**
 * @swagger
 * /api/user/me:
 *   get:
 *     summary: Отримати поточного користувача
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Дані користувача
 *       401:
 *         description: Не авторизовано
 */
async function getMe(req, res) {
  try {
    const user = await UserRepository.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Не знайдено' });
    res.json(safeUser(user));
  } catch (e) { res.status(500).json({ message: e.message }); }
}

/**
 * @swagger
 * /api/user/profile:
 *   put:
 *     summary: Оновити профіль (нікнейм, bio, аватарка)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nickname:
 *                 type: string
 *               bio:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 description: base64 зображення
 *     responses:
 *       200:
 *         description: Оновлений профіль
 */
async function updateProfile(req, res) {
  try {
    const { nickname, bio, avatar } = req.body;
    if (nickname) {
      const existing = await UserRepository.findByNicknameExcept(nickname, req.user.id);
      if (existing)
        return res.status(400).json({ message: `Нікнейм "${nickname}" вже зайнятий` });
    }
    const update = {};
    if (nickname)             update.nickname = nickname.trim();
    if (bio !== undefined)    update.bio      = bio;
    if (avatar !== undefined) update.avatar   = avatar;

    await UserRepository.updateById(req.user.id, update);
    const user = await UserRepository.findById(req.user.id);
    res.json(safeUser(user));
  } catch (e) {
    console.error('[updateProfile]', e.message);
    res.status(500).json({ message: e.message });
  }
}

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: Пошук користувачів за нікнеймом
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Рядок пошуку (мінімум 2 символи)
 *     responses:
 *       200:
 *         description: Список користувачів
 */
async function searchUsers(req, res) {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json([]);
    const users = await UserRepository.searchByNickname(q, req.user.id);
    res.json(users.map(safeUser));
  } catch (e) { res.status(500).json({ message: e.message }); }
}

/**
 * @swagger
 * /api/users/following:
 *   get:
 *     summary: Список підписок поточного користувача
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список користувачів
 */
async function getFollowing(req, res) {
  try {
    const me = await UserRepository.findWithFollowing(req.user.id);
    if (!me) return res.json([]);
    res.json((me.following || []).map(safeUser));
  } catch (e) { res.status(500).json({ message: e.message }); }
}

/**
 * @swagger
 * /api/users/{id}/follow:
 *   post:
 *     summary: Підписатись / відписатись від користувача
 *     tags: [User]
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
 *         description: Результат підписки
 *       400:
 *         description: Не можна підписатись на себе
 */
async function toggleFollow(req, res) {
  try {
    const targetId = req.params.id;
    const myId     = String(req.user.id);

    if (targetId === myId)
      return res.status(400).json({ message: 'Не можна підписатись на себе' });

    const me     = await UserRepository.findById(myId);
    const target = await UserRepository.findById(targetId);
    if (!me)     return res.status(404).json({ message: 'Акаунт не знайдено' });
    if (!target) return res.status(404).json({ message: 'Користувача не знайдено' });

    const already = UserRepository.isFollowing(me, targetId);

    if (already) {
      await UserRepository.removeFollowing(myId, target._id, targetId, me._id);
      await publish('user.unfollowed', { userId: myId, targetId, targetNickname: target.nickname });
      return res.json({ following: false, message: `Відписались від @${target.nickname}` });
    } else {
      await UserRepository.addFollowing(myId, targetId);
      await publish('user.followed', { userId: myId, targetId, targetNickname: target.nickname });
      return res.json({ following: true, message: `Підписались на @${target.nickname}` });
    }
  } catch (e) {
    console.error('[toggleFollow]', e.message);
    res.status(500).json({ message: e.message });
  }
}

module.exports = { getMe, updateProfile, searchUsers, getFollowing, toggleFollow };
