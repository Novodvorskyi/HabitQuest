/* ═══════════════════════════════════
   middleware/auth.js
═══════════════════════════════════ */

const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header)
    return res.status(401).json({ message: 'Токен відсутній' });

  const token = header.split(' ')[1];
  if (!token)
    return res.status(401).json({ message: 'Токен відсутній' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Невалідний або прострочений токен' });
  }
}

module.exports = authMiddleware;
