/* ═══════════════════════════════════
   config/constants.js
═══════════════════════════════════ */

const XP_TABLE = { easy: 10, medium: 25, hard: 50 };
const COIN_TABLE = { easy: 5, medium: 12, hard: 25 };

const LEVELS = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 6000];

const FRAMES = [
  { id: 'silver',   name: 'Срібна',      color: '#a8b2c0', level: 1,  price: 50   },
  { id: 'gold',     name: 'Золота',      color: '#f5c542', level: 2,  price: 100  },
  { id: 'emerald',  name: 'Смарагдова',  color: '#3de0b0', level: 3,  price: 180  },
  { id: 'ruby',     name: 'Рубінова',    color: '#fc5c7d', level: 4,  price: 280  },
  { id: 'sapphire', name: 'Сапфірова',   color: '#5c9bfc', level: 5,  price: 400  },
  { id: 'violet',   name: 'Фіолетова',   color: '#7c5cfc', level: 6,  price: 550  },
  { id: 'rainbow',  name: 'Райдужна',    color: 'rainbow', level: 8,  price: 900  },
  { id: 'obsidian', name: 'Обсидіанова', color: '#2a1e3a', level: 10, price: 1500 },
];

function calcLevel(xp) {
  let level = 1;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i]) { level = i + 1; break; }
  }
  return level;
}

module.exports = { XP_TABLE, COIN_TABLE, LEVELS, FRAMES, calcLevel };
