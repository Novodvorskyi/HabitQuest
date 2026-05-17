/* ═══════════════════════════════════════════════════
   tests/unit/constants.test.js
   Тести бізнес-логіки: XP, монети, рівні, рамки
═══════════════════════════════════════════════════ */

const { XP_TABLE, COIN_TABLE, LEVELS, FRAMES, calcLevel } = require('../../config/constants');

/* ── calcLevel ── */
describe('calcLevel()', () => {
  test('рівень 1 при XP = 0', () => {
    expect(calcLevel(0)).toBe(1);
  });

  test('рівень 1 при XP = 99', () => {
    expect(calcLevel(99)).toBe(1);
  });

  test('рівень 2 при XP = 100', () => {
    expect(calcLevel(100)).toBe(2);
  });

  test('рівень 2 при XP = 249', () => {
    expect(calcLevel(249)).toBe(2);
  });

  test('рівень 3 при XP = 250', () => {
    expect(calcLevel(250)).toBe(3);
  });

  test('рівень 4 при XP = 500', () => {
    expect(calcLevel(500)).toBe(4);
  });

  test('рівень 5 при XP = 900', () => {
    expect(calcLevel(900)).toBe(5);
  });

  test('рівень 10 при XP = 6000', () => {
    expect(calcLevel(6000)).toBe(10);
  });

  test('рівень 10 при XP = 99999', () => {
    expect(calcLevel(99999)).toBe(10);
  });

  test('не повертає рівень менше 1', () => {
    expect(calcLevel(-100)).toBe(1);
  });
});

/* ── XP_TABLE ── */
describe('XP_TABLE', () => {
  test('easy дає 10 XP', () => {
    expect(XP_TABLE.easy).toBe(10);
  });

  test('medium дає 25 XP', () => {
    expect(XP_TABLE.medium).toBe(25);
  });

  test('hard дає 50 XP', () => {
    expect(XP_TABLE.hard).toBe(50);
  });

  test('hard дає більше ніж medium', () => {
    expect(XP_TABLE.hard).toBeGreaterThan(XP_TABLE.medium);
  });

  test('medium дає більше ніж easy', () => {
    expect(XP_TABLE.medium).toBeGreaterThan(XP_TABLE.easy);
  });
});

/* ── COIN_TABLE ── */
describe('COIN_TABLE', () => {
  test('easy дає 5 монет', () => {
    expect(COIN_TABLE.easy).toBe(5);
  });

  test('medium дає 12 монет', () => {
    expect(COIN_TABLE.medium).toBe(12);
  });

  test('hard дає 25 монет', () => {
    expect(COIN_TABLE.hard).toBe(25);
  });

  test('монети пропорційні складності', () => {
    expect(COIN_TABLE.easy).toBeLessThan(COIN_TABLE.medium);
    expect(COIN_TABLE.medium).toBeLessThan(COIN_TABLE.hard);
  });
});

/* ── FRAMES ── */
describe('FRAMES', () => {
  test('є 8 рамок', () => {
    expect(FRAMES).toHaveLength(8);
  });

  test('кожна рамка має обов\'язкові поля', () => {
    FRAMES.forEach(f => {
      expect(f).toHaveProperty('id');
      expect(f).toHaveProperty('name');
      expect(f).toHaveProperty('color');
      expect(f).toHaveProperty('level');
      expect(f).toHaveProperty('price');
    });
  });

  test('перша рамка доступна з рівня 1', () => {
    const first = FRAMES.find(f => f.level === 1);
    expect(first).toBeDefined();
  });

  test('рамки відсортовані за рівнем', () => {
    for (let i = 1; i < FRAMES.length; i++) {
      expect(FRAMES[i].level).toBeGreaterThanOrEqual(FRAMES[i - 1].level);
    }
  });

  test('ціни є додатніми числами', () => {
    FRAMES.forEach(f => {
      expect(f.price).toBeGreaterThan(0);
    });
  });

  test('дорожчі рамки мають вищий або рівний рівень', () => {
    const sorted = [...FRAMES].sort((a, b) => a.price - b.price);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].level).toBeGreaterThanOrEqual(sorted[i - 1].level);
    }
  });

  test('всі id рамок унікальні', () => {
    const ids = FRAMES.map(f => f.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  test('rainbow рамка існує', () => {
    const rainbow = FRAMES.find(f => f.id === 'rainbow');
    expect(rainbow).toBeDefined();
  });

  test('obsidian — найдорожча рамка', () => {
    const maxPrice = Math.max(...FRAMES.map(f => f.price));
    const obsidian = FRAMES.find(f => f.id === 'obsidian');
    expect(obsidian.price).toBe(maxPrice);
  });
});

/* ── LEVELS ── */
describe('LEVELS', () => {
  test('є 10 порогів рівнів', () => {
    expect(LEVELS).toHaveLength(10);
  });

  test('перший рівень починається з 0 XP', () => {
    expect(LEVELS[0]).toBe(0);
  });

  test('пороги зростають', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i]).toBeGreaterThan(LEVELS[i - 1]);
    }
  });
});
