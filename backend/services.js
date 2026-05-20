/* ═══════════════════════════════════════════════════════════
   services.js — Сервіси-підписники RabbitMQ
   XPService, CoinService, LevelService, LogService
═══════════════════════════════════════════════════════════ */

const { subscribe, publish } = require('./broker');
const { User, EventLog }     = require('./models');

const XP_TABLE    = { easy: 10, medium: 25, hard: 50 };
const COIN_TABLE  = { easy: 5,  medium: 12, hard: 25 };
const LEVELS      = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 6000];

function calcLevel(xp) {
  let level = 1;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i]) { level = i + 1; break; }
  }
  return level;
}

/* ══ XPService + CoinService ══
   Черга: xp_service_queue
   Слухає: item.completed
   Нараховує XP і монети одночасно */
async function startXPService() {
  await subscribe('xp_service_queue', ['item.completed'], async (routingKey, payload) => {
    const { userId, difficulty, type } = payload;
    const xpGain   = XP_TABLE[difficulty]   || 10;
    const coinGain = COIN_TABLE[difficulty]  || 5;

    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { xp: xpGain, coins: coinGain } },
      { new: true }
    );
    if (!user) return;

    console.log(`[XPService] ⚡ +${xpGain} XP +${coinGain}🪙 для ${user.login}`);
    await publish('xp.updated', { userId, xp: user.xp, coins: user.coins, xpGain, coinGain, ...payload });
  });
  console.log('[XPService] ✅ Запущено');
}

/* ══ LevelService ══
   Черга: level_service_queue
   Слухає: xp.updated */
async function startLevelService() {
  await subscribe('level_service_queue', ['xp.updated'], async (routingKey, payload) => {
    const { userId, xp } = payload;
    const user = await User.findById(userId);
    if (!user) return;

    const oldLevel = user.level;
    const newLevel = calcLevel(xp);

    if (newLevel > oldLevel) {
      user.level = newLevel;
      await user.save();
      console.log(`[LevelService] 🏆 ${user.login}: ${oldLevel} → ${newLevel}`);
      await publish('level.up', { userId, oldLevel, newLevel, login: user.login });
    }
  });
  console.log('[LevelService] ✅ Запущено');
}

/* ══ LogService ══
   Черга: log_service_queue */
async function startLogService() {
  await subscribe(
    'log_service_queue',
    ['item.completed', 'item.created', 'item.deleted', 'level.up',
     'user.followed', 'user.unfollowed', 'shop.purchased', 'shop.equipped'],
    async (routingKey, payload) => {
      let logEntry = { userId: payload.userId, eventType: routingKey, coins: 0 };

      switch (routingKey) {
        case 'item.completed':
          logEntry = { ...logEntry,
            icon: payload.type === 'habit' ? '◉' : '✓',
            action: `${payload.type === 'habit' ? 'Звичку' : 'Завдання'} виконано`,
            detail: `"${payload.itemName}"`,
            xp: XP_TABLE[payload.difficulty] || 0,
            coins: COIN_TABLE[payload.difficulty] || 0,
          }; break;
        case 'item.created':
          logEntry = { ...logEntry, icon: '＋',
            action: `Створено ${payload.type === 'habit' ? 'звичку' : 'завдання'}`,
            detail: `"${payload.itemName}"`, xp: 0 }; break;
        case 'item.deleted':
          logEntry = { ...logEntry, icon: '✕',
            action: `Видалено ${payload.type === 'habit' ? 'звичку' : 'завдання'}`,
            detail: `"${payload.itemName}"`, xp: 0 }; break;
        case 'level.up':
          logEntry = { ...logEntry, icon: '🏆', action: 'Новий рівень!',
            detail: `${payload.oldLevel} → ${payload.newLevel}`, xp: 0 }; break;
        case 'user.followed':
          logEntry = { ...logEntry, icon: '👤', action: 'Підписався',
            detail: `@${payload.targetNickname}`, xp: 0 }; break;
        case 'user.unfollowed':
          logEntry = { ...logEntry, icon: '👤', action: 'Відписався',
            detail: `@${payload.targetNickname}`, xp: 0 }; break;
        case 'shop.purchased':
          logEntry = { ...logEntry, icon: '🛒', action: 'Куплено рамку',
            detail: payload.frameName, xp: 0, coins: -payload.price }; break;
        case 'shop.equipped':
          logEntry = { ...logEntry, icon: '✨', action: 'Надіто рамку',
            detail: payload.frameName, xp: 0 }; break;
      }

      await EventLog.create(logEntry);
      console.log(`[LogService] 📝 ${logEntry.action} — ${logEntry.detail}`);
    }
  );
  console.log('[LogService] ✅ Запущено');
}

async function startAllServices() {
  await startXPService();
  await startLevelService();
  await startLogService();
  console.log('\n[Services] 🚀 Всі сервіси запущено\n');
}

module.exports = { startAllServices };
