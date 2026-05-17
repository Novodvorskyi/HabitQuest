/* ═══════════════════════════════════
   controllers/authController.js
═══════════════════════════════════ */

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const UserRepository = require('../repositories/userRepository');

function safeUser(u) {
  return {
    id: u._id, nickname: u.nickname, avatar: u.avatar, bio: u.bio,
    xp: u.xp, level: u.level, coins: u.coins, streak: u.streak,
    totalTasksDone: u.totalTasksDone, totalHabitsDone: u.totalHabitsDone,
    ownedFrames: u.ownedFrames || [], activeFrame: u.activeFrame || '',
    following: u.following || [], followers: u.followers || [],
    createdAt: u.createdAt,
  };
}

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Реєстрація нового користувача
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nickname, password]
 *             properties:
 *               nickname:
 *                 type: string
 *                 example: CoolPlayer
 *               password:
 *                 type: string
 *                 example: secret123
 *     responses:
 *       200:
 *         description: Успішна реєстрація, повертає токен і дані користувача
 *       400:
 *         description: Нікнейм вже зайнятий або невалідні дані
 */
async function register(req, res) {
  try {
    const { nickname, password } = req.body;
    if (!nickname || !password)
      return res.status(400).json({ message: 'Заповни всі поля' });
    if (nickname.length < 2)
      return res.status(400).json({ message: 'Нікнейм мінімум 2 символи' });
    if (password.length < 4)
      return res.status(400).json({ message: 'Пароль мінімум 4 символи' });

    const exists = await UserRepository.findByNickname(nickname);
    if (exists)
      return res.status(400).json({ message: `Нікнейм "${nickname}" вже зайнятий` });

    const passwordHash = await bcrypt.hash(password, 10);
    const user  = await UserRepository.create({ nickname: nickname.trim(), passwordHash });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: safeUser(user) });
  } catch (e) {
    console.error('[register]', e.message);
    res.status(500).json({ message: e.message });
  }
}

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вхід у систему
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nickname, password]
 *             properties:
 *               nickname:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Успішний вхід
 *       400:
 *         description: Невірні дані
 */
async function login(req, res) {
  try {
    const { nickname, password } = req.body;
    if (!nickname || !password)
      return res.status(400).json({ message: 'Заповни всі поля' });

    const user = await UserRepository.findByNickname(nickname);
    if (!user)
      return res.status(400).json({ message: 'Невірний нікнейм або пароль' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok)
      return res.status(400).json({ message: 'Невірний нікнейм або пароль' });

    const today     = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let newStreak = 1;
    if (user.lastDate === yesterday)  newStreak = (user.streak || 0) + 1;
    else if (user.lastDate === today) newStreak = user.streak || 1;

    await UserRepository.updateById(user._id, { streak: newStreak, lastDate: today });
    user.streak = newStreak;

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: safeUser(user) });
  } catch (e) {
    console.error('[login]', e.message);
    res.status(500).json({ message: e.message });
  }
}

module.exports = { register, login, safeUser };
