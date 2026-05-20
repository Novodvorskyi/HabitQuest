/* ═══════════════════════════════════════════════════
   HABITQUEST — app.js  (виправлена версія)
═══════════════════════════════════════════════════ */

const API_URL    = 'http://localhost:5000/api';
const XP_TABLE   = { easy: 10, medium: 25, hard: 50 };
const COIN_TABLE = { easy: 5,  medium: 12, hard: 25 };
const LEVELS     = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 6000];

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

/* ══ EVENT BUS ══ */
const EventBus = (() => {
  const h = {};
  return {
    subscribe(e, fn) { (h[e] = h[e] || []).push(fn); },
    publish(e, d)    { console.log(`[EventBus] ${e}`, d); (h[e] || []).forEach(fn => fn(d)); }
  };
})();

/* ══ STATE ══ */
let state = {
  token:     localStorage.getItem('hq_token') || null,
  user:      JSON.parse(localStorage.getItem('hq_user') || 'null'),
  habits:    [],
  tasks:     [],
  history:   [],
  following: [],
};

/* ══ API ══ */
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (state.token) opts.headers['Authorization'] = `Bearer ${state.token}`;
  if (body) opts.body = JSON.stringify(body);
  let res, data;
  try {
    res  = await fetch(API_URL + path, opts);
    data = await res.json();
  } catch (e) {
    throw new Error('Немає зв\'язку з сервером. Перевір що backend запущено.');
  }
  if (!res.ok) throw new Error(data.message || 'Помилка сервера');
  return data;
}

/* ══ SERVICES ══ */
EventBus.subscribe('item.completed', ({ itemName, difficulty }) => {
  const xp    = XP_TABLE[difficulty]   || 10;
  const coins = COIN_TABLE[difficulty] || 5;
  showToast(`+${xp} XP  +${coins}🪙  за "${itemName}"`, 'xp');
});

EventBus.subscribe('level.up', ({ level }) => {
  const unlocked = FRAMES.find(f => f.level === level);
  document.getElementById('levelup-num').textContent  = level;
  document.getElementById('levelup-hint').textContent = unlocked
    ? `🎁 Відкрито рамку "${unlocked.name}" у магазині!` : '';
  document.getElementById('levelup-overlay').classList.remove('hidden');
});

EventBus.subscribe('profile.updated', ({ user }) => {
  state.user = user;
  localStorage.setItem('hq_user', JSON.stringify(user));
  updateUserUI();
  renderProfilePage();
});

EventBus.subscribe('shop.action', ({ user }) => {
  state.user = user;
  localStorage.setItem('hq_user', JSON.stringify(user));
  updateUserUI();
  renderShop();
  renderProfilePage();
});

/* ══ PASSWORD TOGGLE ══ */
function togglePass(inputId, btn) {
  const input = document.getElementById(inputId);
  input.type  = input.type === 'password' ? 'text' : 'password';
  btn.textContent = input.type === 'password' ? '👁' : '🙈';
}

/* ══ CLEAR AUTH FIELDS ══ */
function clearAuthFields() {
  ['login-nickname','login-password','reg-nickname','reg-password']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  ['login-error','reg-error']
    .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ''; });
  document.querySelectorAll('.pass-toggle').forEach(btn => {
    btn.textContent = '👁';
    const inp = btn.previousElementSibling;
    if (inp) inp.type = 'password';
  });
}

/* ══ AUTH ══ */
async function register() {
  const nickname = document.getElementById('reg-nickname').value.trim();
  const password = document.getElementById('reg-password').value;
  const errEl    = document.getElementById('reg-error');
  errEl.textContent = '';

  if (!nickname || !password) { errEl.textContent = 'Заповни всі поля'; return; }
  if (nickname.length < 2)    { errEl.textContent = 'Нікнейм мінімум 2 символи'; return; }
  if (password.length < 4)    { errEl.textContent = 'Пароль мінімум 4 символи'; return; }

  try {
    const data = await api('POST', '/auth/register', { nickname, password });
    saveSession(data);
    showApp();
  } catch (e) { errEl.textContent = e.message; }
}

async function login() {
  const nickname = document.getElementById('login-nickname').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  errEl.textContent = '';

  if (!nickname || !password) { errEl.textContent = 'Заповни всі поля'; return; }

  try {
    const data = await api('POST', '/auth/login', { nickname, password });
    saveSession(data);
    showApp();
  } catch (e) { errEl.textContent = e.message; }
}

function saveSession(data) {
  state.token = data.token;
  state.user  = data.user;
  localStorage.setItem('hq_token', data.token);
  localStorage.setItem('hq_user',  JSON.stringify(data.user));
}

function logout() {
  state = { token: null, user: null, habits: [], tasks: [], history: [], following: [] };
  localStorage.removeItem('hq_token');
  localStorage.removeItem('hq_user');
  clearAuthFields();
  document.getElementById('app-screen').classList.remove('active');
  document.getElementById('auth-screen').classList.add('active');
  /* Повертаємо першу вкладку nav */
  document.querySelectorAll('.nav-btn').forEach((b,i) => b.classList.toggle('active', i===0));
  document.querySelectorAll('.page').forEach((p,i) => p.classList.toggle('active', i===0));
}

/* ══ APP INIT ══ */
async function showApp() {
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('app-screen').classList.add('active');
  document.getElementById('today-date').textContent =
    new Date().toLocaleDateString('uk-UA', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  await loadAll();
}

async function loadAll() {
  try {
    const [habits, tasks, history, following, me] = await Promise.all([
      api('GET', '/habits'),
      api('GET', '/tasks'),
      api('GET', '/history'),
      api('GET', '/users/following'),
      api('GET', '/user/me'),
    ]);
    state.habits    = habits    || [];
    state.tasks     = tasks     || [];
    state.history   = history   || [];
    state.following = following || [];
    state.user      = me;
    localStorage.setItem('hq_user', JSON.stringify(me));
    updateUserUI();
    renderAll();
  } catch (e) {
    console.error('loadAll:', e.message);
    showToast(e.message, 'err');
  }
}

/* ══ USER UI ══ */
function frameColor(frameId) {
  if (!frameId) return null;
  const f = FRAMES.find(x => x.id === frameId);
  return f ? f.color : null;
}

function applyFrameToEl(el, frameId) {
  el.style.border      = '';
  el.style.boxShadow   = '';
  el.style.outline     = '';
  el.style.outlineOffset = '';
  if (!frameId) return;
  const color = frameColor(frameId);
  if (!color) return;
  if (color === 'rainbow') {
    el.style.outline       = '3px solid transparent';
    el.style.outlineOffset = '2px';
    el.style.boxShadow     = '0 0 0 3px #fc5c7d, 0 0 0 5px #f5c542, 0 0 0 7px #3de0b0';
  } else {
    el.style.border    = `3px solid ${color}`;
    el.style.boxShadow = `0 0 10px ${color}66`;
  }
}

function updateUserUI() {
  const u = state.user;
  if (!u) return;

  document.getElementById('user-name').textContent      = u.nickname || '—';
  document.getElementById('user-level').textContent     = u.level || 1;
  document.getElementById('sidebar-coins').textContent  = u.coins || 0;
  document.getElementById('stat-xp').textContent        = u.xp || 0;
  document.getElementById('stat-coins').textContent     = u.coins || 0;
  document.getElementById('stat-streak').textContent    = u.streak || 0;
  document.getElementById('shop-coins').textContent     = u.coins || 0;

  /* Аватарка сайдбар */
  const sav = document.getElementById('sidebar-avatar');
  if (u.avatar) sav.innerHTML = `<img src="${u.avatar}" alt="av" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
  else          sav.textContent = (u.nickname || '?')[0].toUpperCase();
  applyFrameToEl(sav, u.activeFrame);

  /* XP bar */
  const level  = u.level || 1;
  const xpCur  = u.xp    || 0;
  const xpThis = LEVELS[Math.min(level - 1, LEVELS.length - 1)] || 0;
  const xpNext = LEVELS[Math.min(level,     LEVELS.length - 1)] || xpThis + 1000;
  const pct    = xpNext > xpThis ? Math.min(100, ((xpCur - xpThis) / (xpNext - xpThis)) * 100) : 100;
  document.getElementById('xp-bar').style.width      = pct + '%';
  document.getElementById('xp-current').textContent  = xpCur;
  document.getElementById('xp-next').textContent     = xpNext;

  /* Виконано сьогодні */
  const today = new Date().toDateString();
  const doneToday = (state.history || []).filter(h =>
    new Date(h.createdAt).toDateString() === today && h.xp > 0
  ).length;
  document.getElementById('stat-done').textContent = doneToday;
}

/* ══ RENDER ALL ══ */
function renderAll() {
  renderHabits();
  renderTasks();
  renderDashboard();
  renderShop();
  renderProfilePage();
}

/* ══ HABITS ══ */
function renderHabits() {
  const el = document.getElementById('habits-list');
  el.innerHTML = '';
  if (!state.habits.length) { el.innerHTML = '<div class="empty-msg">Немає звичок. Додай першу!</div>'; return; }
  state.habits.forEach(h => el.appendChild(buildCard(h, 'habit', isDoneToday(h.name))));
}

/* ══ TASKS ══ */
function renderTasks() {
  const el = document.getElementById('tasks-list');
  el.innerHTML = '';
  if (!state.tasks.length) { el.innerHTML = '<div class="empty-msg">Немає завдань.</div>'; return; }
  state.tasks.forEach(t => el.appendChild(buildCard(t, 'task', false)));
}

/* ══ DASHBOARD ══ */
function renderDashboard() {
  const dh = document.getElementById('dash-habits');
  dh.innerHTML = '';
  if (!state.habits.length) dh.innerHTML = '<div class="empty-msg">Немає звичок</div>';
  else state.habits.slice(0,4).forEach(h => dh.appendChild(buildCard(h,'habit',isDoneToday(h.name))));

  const dt = document.getElementById('dash-tasks');
  dt.innerHTML = '';
  const sorted = [...state.tasks].sort((a,b) => new Date(a.deadline||0)-new Date(b.deadline||0)).slice(0,4);
  if (!sorted.length) dt.innerHTML = '<div class="empty-msg">Немає завдань</div>';
  else sorted.forEach(t => dt.appendChild(buildCard(t,'task',false)));
}

/* ══ SHOP ══ */
function renderShop() {
  const el = document.getElementById('frames-grid');
  if (!el || !state.user) return;
  el.innerHTML = '';
  const u = state.user;

  FRAMES.forEach(frame => {
    const owned  = (u.ownedFrames || []).includes(frame.id);
    const active = u.activeFrame === frame.id;
    const locked = (u.level || 1) < frame.level;
    const afford = (u.coins || 0) >= frame.price;

    const card = document.createElement('div');
    card.className = `frame-card${locked ? ' locked' : ''}`;

    /* Превью кола з рамкою */
    let previewStyle = 'width:72px;height:72px;border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:1.5rem;';
    if (frame.color === 'rainbow') {
      previewStyle += 'box-shadow:0 0 0 4px #fc5c7d,0 0 0 7px #f5c542,0 0 0 10px #3de0b0;';
    } else {
      previewStyle += `border:4px solid ${frame.color};box-shadow:0 0 12px ${frame.color}55;`;
    }

    let btnClass = 'btn-buy', btnText = '', disabled = '';
    if (locked)              { btnClass += ' locked';       btnText = `🔒 Рівень ${frame.level}`; disabled = 'disabled'; }
    else if (active)         { btnClass += ' owned-active'; btnText = '✓ Активна (зняти)'; }
    else if (owned)          { btnClass += ' owned-inactive'; btnText = 'Надіти'; }
    else if (!afford)        { btnClass += ' locked';       btnText = `${frame.price}🪙 (не вистачає)`; disabled = 'disabled'; }
    else                     { btnClass += ' available';    btnText = `Купити ${frame.price}🪙`; }

    card.innerHTML = `
      <div style="${previewStyle}">◈</div>
      <div class="frame-name">${frame.name}</div>
      <div class="frame-meta">З рівня ${frame.level}</div>
      <button class="${btnClass}" onclick="handleShopAction('${frame.id}')" ${disabled}>${btnText}</button>
    `;
    el.appendChild(card);
  });
}

async function handleShopAction(frameId) {
  const u     = state.user;
  const frame = FRAMES.find(f => f.id === frameId);
  if (!frame || !u) return;

  const owned = (u.ownedFrames || []).includes(frameId);
  try {
    const endpoint = owned ? `/shop/equip/${frameId}` : `/shop/buy/${frameId}`;
    const updated  = await api('POST', endpoint);
    EventBus.publish('shop.action', { user: updated });
    if (owned) showToast(updated.activeFrame === frameId ? `✨ Надіто "${frame.name}"` : 'Рамку знято');
    else       showToast(`🛒 Куплено "${frame.name}"!`, 'coins');
  } catch (e) { showToast(e.message, 'err'); }
}

/* ══ PROFILE ══ */
function renderProfilePage() {
  const u = state.user;
  if (!u) return;

  /* Аватарка */
  const pd = document.getElementById('profile-avatar-display');
  if (u.avatar) pd.innerHTML = `<img src="${u.avatar}" alt="av" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
  else          pd.textContent = (u.nickname || '?')[0].toUpperCase();
  applyFrameToEl(pd, u.activeFrame);

  document.getElementById('profile-name-display').textContent = '@' + (u.nickname || '—');
  document.getElementById('profile-bio-display').textContent  = u.bio || '';
  document.getElementById('edit-nickname').value = u.nickname || '';
  document.getElementById('edit-bio').value      = u.bio      || '';

  document.getElementById('ps-level').textContent      = u.level           || 1;
  document.getElementById('ps-xp').textContent         = u.xp              || 0;
  document.getElementById('ps-coins').textContent      = u.coins           || 0;
  document.getElementById('ps-streak').textContent     = u.streak          || 0;
  document.getElementById('ps-habits-done').textContent = u.totalHabitsDone || 0;
  document.getElementById('ps-tasks-done').textContent  = u.totalTasksDone  || 0;

  renderFollowing();
  renderHistory();
}

function renderFollowing() {
  const el = document.getElementById('following-list');
  el.innerHTML = '';
  if (!state.following.length) {
    el.innerHTML = '<div class="empty-msg">Ти ще ні на кого не підписаний</div>';
    return;
  }
  state.following.forEach(u => el.appendChild(buildUserRow(u, true)));
}

function renderHistory() {
  const el = document.getElementById('profile-history');
  el.innerHTML = '';
  if (!state.history.length) { el.innerHTML = '<div class="empty-msg">Журнал порожній</div>'; return; }
  state.history.slice(0, 60).forEach(h => {
    const div = document.createElement('div');
    div.className = 'hist-item';
    div.innerHTML = `
      <span class="hist-icon">${h.icon || '●'}</span>
      <div class="hist-body">
        <div class="hist-action">${h.action}</div>
        <div class="hist-detail">${h.detail || ''}</div>
      </div>
      ${h.xp    > 0 ? `<span class="hist-xp">+${h.xp} XP</span>`    : ''}
      ${h.coins > 0 ? `<span class="hist-coins">+${h.coins}🪙</span>` : ''}
      ${h.coins < 0 ? `<span class="hist-coins" style="color:var(--accent3)">${h.coins}🪙</span>` : ''}
      <span class="hist-time">${fmtDate(h.createdAt)}</span>
    `;
    el.appendChild(div);
  });
}

/* ══ USER ROW ══ */
function buildUserRow(u, isFollowing) {
  const row = document.createElement('div');
  row.className = 'user-row';

  const uid = String(u.id || u._id || '');
  const avatarHtml = u.avatar
    ? `<img src="${u.avatar}" alt="av" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
    : (u.nickname || '?')[0].toUpperCase();

  /* Рамка у рядку користувача */
  let frameStyle = '';
  if (u.activeFrame) {
    const color = frameColor(u.activeFrame);
    if (color && color !== 'rainbow') frameStyle = `border:3px solid ${color};box-shadow:0 0 8px ${color}55;`;
    else if (color === 'rainbow')     frameStyle = 'box-shadow:0 0 0 2px #fc5c7d,0 0 0 4px #f5c542,0 0 0 6px #3de0b0;';
  }

  const frameName = u.activeFrame ? (FRAMES.find(f => f.id === u.activeFrame)?.name || '') : '';

  row.innerHTML = `
    <div style="position:relative;width:44px;height:44px;flex-shrink:0;">
      <div class="user-row-avatar" style="${frameStyle}">${avatarHtml}</div>
    </div>
    <div class="user-row-info">
      <div class="user-row-name">@${u.nickname || '—'}</div>
      <div class="user-row-meta">Рівень ${u.level||1} · ${u.xp||0} XP${frameName ? ' · 🎨 '+frameName : ''}</div>
    </div>
    <button class="btn-follow ${isFollowing?'following':''}" data-uid="${uid}">
      ${isFollowing ? 'Відписатись' : 'Підписатись'}
    </button>
  `;

  row.querySelector('.btn-follow').addEventListener('click', function() {
    toggleFollow(uid, this);
  });

  return row;
}

/* ══ SEARCH ══ */
let _searchTimer = null;
function searchUsers() {
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(async () => {
    const q   = document.getElementById('user-search-input').value.trim();
    const el  = document.getElementById('search-results');
    el.innerHTML = '';
    if (q.length < 2) return;
    try {
      const users = await api('GET', `/users/search?q=${encodeURIComponent(q)}`);
      if (!users.length) { el.innerHTML = '<div class="empty-msg">Нікого не знайдено</div>'; return; }
      const followingIds = (state.following || []).map(f => String(f.id||f._id));
      users.forEach(u => el.appendChild(buildUserRow(u, followingIds.includes(String(u.id||u._id)))));
    } catch(e) { console.error(e); }
  }, 400);
}

/* ══ FOLLOW ══ */
async function toggleFollow(userId, btn) {
  if (!userId || userId === 'undefined') { showToast('Помилка: невірний ID', 'err'); return; }
  btn.disabled = true;
  try {
    const data = await api('POST', `/users/${userId}/follow`);
    const isNow = data.following;
    btn.textContent = isNow ? 'Відписатись' : 'Підписатись';
    btn.classList.toggle('following', isNow);
    /* Оновлюємо список підписок */
    state.following = await api('GET', '/users/following');
    const me = await api('GET', '/user/me');
    state.user = me;
    localStorage.setItem('hq_user', JSON.stringify(me));
    renderFollowing();
    renderProfilePage();
    showToast(data.message);
  } catch(e) { showToast(e.message, 'err'); }
  finally { btn.disabled = false; }
}

/* ══ AVATAR ══ */
function uploadAvatar(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showToast('Файл занадто великий (макс. 2 МБ)', 'err'); return; }
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const user = await api('PUT', '/user/profile', { avatar: e.target.result });
      EventBus.publish('profile.updated', { user });
      showToast('Аватарку оновлено!');
    } catch(err) { showToast(err.message, 'err'); }
  };
  reader.readAsDataURL(file);
}

/* ══ SAVE PROFILE ══ */
async function saveProfile() {
  const nickname = document.getElementById('edit-nickname').value.trim();
  const bio      = document.getElementById('edit-bio').value.trim();
  if (!nickname) { showToast('Нікнейм не може бути порожнім', 'err'); return; }
  try {
    const user = await api('PUT', '/user/profile', { nickname, bio });
    EventBus.publish('profile.updated', { user });
    showToast('Профіль збережено!');
  } catch(e) { showToast(e.message, 'err'); }
}

/* ══ COMPLETE ══ */
async function complete(type, id) {
  const arr  = type === 'habit' ? state.habits : state.tasks;
  const item = arr.find(x => (x._id||x.id) === id);
  if (!item) return;
  try {
    await api('POST', `/${type}s/${id}/complete`);
    EventBus.publish('item.completed', { itemName: item.name, difficulty: item.difficulty, type });
    if (type === 'task') state.tasks = state.tasks.filter(t => (t._id||t.id) !== id);
    /* Оновлюємо юзера і перевіряємо рівень */
    const me = await api('GET', '/user/me');
    const oldLevel = (state.user || {}).level || 1;
    state.user = me;
    localStorage.setItem('hq_user', JSON.stringify(me));
    if (me.level > oldLevel) EventBus.publish('level.up', { level: me.level });
    state.history = await api('GET', '/history');
    renderAll();
    updateUserUI();
  } catch(e) { showToast(e.message, 'err'); }
}

/* ══ DELETE ══ */
async function deleteItem(type, id) {
  if (!confirm('Видалити?')) return;
  try {
    await api('DELETE', `/${type}s/${id}`);
    if (type === 'habit') state.habits = state.habits.filter(h => (h._id||h.id) !== id);
    else                  state.tasks  = state.tasks.filter(t  => (t._id||t.id) !== id);
    state.history = await api('GET', '/history');
    renderAll(); updateUserUI();
    showToast('Видалено');
  } catch(e) { showToast(e.message, 'err'); }
}

/* ══ MODAL ══ */
function openModal(type, prefill) {
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('modal-type').value = type;
  document.getElementById('edit-id').value    = prefill ? (prefill._id||prefill.id) : '';
  document.getElementById('modal-title').textContent = prefill
    ? (type==='habit'?'Редагувати звичку':'Редагувати завдання')
    : (type==='habit'?'Нова звичка':'Нове завдання');
  document.getElementById('item-name').value       = prefill?.name        || '';
  document.getElementById('item-desc').value       = prefill?.description || '';
  document.getElementById('item-difficulty').value = prefill?.difficulty  || 'medium';
  document.getElementById('modal-error').textContent = '';
  const isHabit = type === 'habit';
  document.getElementById('habit-fields').classList.toggle('hidden', !isHabit);
  document.getElementById('task-fields').classList.toggle('hidden',   isHabit);
  if (isHabit) {
    document.getElementById('item-frequency').value = prefill?.frequency || 'daily';
    toggleWeekdays();
    document.querySelectorAll('.wd').forEach(el =>
      el.classList.toggle('selected', (prefill?.weekdays||[]).includes(+el.dataset.day))
    );
  } else {
    document.getElementById('item-deadline').value = prefill?.deadline
      ? new Date(prefill.deadline).toISOString().slice(0,16) : '';
  }
}

function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }

function editItem(type, id) {
  const item = (type==='habit'?state.habits:state.tasks).find(x=>(x._id||x.id)===id);
  if (item) openModal(type, item);
}

async function saveItem() {
  const type       = document.getElementById('modal-type').value;
  const editId     = document.getElementById('edit-id').value;
  const name       = document.getElementById('item-name').value.trim();
  const description = document.getElementById('item-desc').value.trim();
  const difficulty  = document.getElementById('item-difficulty').value;
  const errEl      = document.getElementById('modal-error');
  if (!name) { errEl.textContent = 'Назва є обов\'язковою'; return; }
  try {
    if (type === 'habit') {
      const frequency = document.getElementById('item-frequency').value;
      const weekdays  = frequency==='custom'
        ? [...document.querySelectorAll('.wd.selected')].map(el=>+el.dataset.day) : [];
      if (editId) {
        const u = await api('PUT',`/habits/${editId}`,{name,description,difficulty,frequency,weekdays});
        state.habits = state.habits.map(h=>(h._id||h.id)===editId?u:h);
      } else {
        const c = await api('POST','/habits',{name,description,difficulty,frequency,weekdays});
        state.habits.unshift(c);
      }
    } else {
      const deadline = document.getElementById('item-deadline').value || null;
      if (editId) {
        const u = await api('PUT',`/tasks/${editId}`,{name,description,difficulty,deadline});
        state.tasks = state.tasks.map(t=>(t._id||t.id)===editId?u:t);
      } else {
        const c = await api('POST','/tasks',{name,description,difficulty,deadline});
        state.tasks.push(c);
      }
    }
    state.history = await api('GET','/history');
    closeModal(); renderAll(); updateUserUI();
    showToast(editId?'Збережено':'Додано!');
  } catch(e) { errEl.textContent = e.message; }
}

/* ══ CARD ══ */
function buildCard(item, type, doneToday) {
  const id   = item._id || item.id;
  const card = document.createElement('div');
  card.className = `item-card ${item.difficulty||'medium'}${doneToday?' done-today':''}`;
  const isOverdue = type==='task' && item.deadline && new Date(item.deadline)<new Date();
  const meta = type==='habit'
    ? freqLabel(item.frequency, item.weekdays)
    : (item.deadline
        ? (isOverdue?'⚠ Протерміновано: ':'Дедлайн: ') + fmtDate(item.deadline)
        : 'Без дедлайну');
  card.innerHTML = `
    <div class="item-top">
      <div class="item-name">${item.name}</div>
      <span class="diff-badge badge-${item.difficulty||'medium'}">${XP_TABLE[item.difficulty||'medium']}XP/${COIN_TABLE[item.difficulty||'medium']}🪙</span>
    </div>
    ${item.description ? `<div class="item-desc">${item.description}</div>` : ''}
    <div class="item-meta${isOverdue?' overdue':''}">${meta}</div>
    <div class="item-actions">
      ${doneToday
        ? '<span style="font-size:.82rem;color:var(--accent2);font-weight:700">✓ Виконано сьогодні</span>'
        : `<button class="btn-complete" onclick="complete('${type}','${id}')">✓ Виконати</button>`}
      <button class="btn-icon" onclick="editItem('${type}','${id}')">✎</button>
      <button class="btn-icon del" onclick="deleteItem('${type}','${id}')">✕</button>
    </div>
  `;
  return card;
}

/* ══ HELPERS ══ */
function isDoneToday(name) {
  const today = new Date().toDateString();
  return (state.history||[]).some(h =>
    h.detail && h.detail.includes(`"${name}"`) &&
    new Date(h.createdAt).toDateString() === today && h.xp > 0
  );
}

function freqLabel(freq, weekdays) {
  if (freq==='daily')  return '🔁 Щодня';
  if (freq==='weekly') return '📅 Щотижня';
  const days = ['Нд','Пн','Вт','Ср','Чт','Пт','Сб'];
  return '📅 ' + (weekdays||[]).map(d=>days[d]).join(', ');
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('uk-UA',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
}

function showToast(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = `toast show${type?' '+type:''}`;
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 3500);
}

function closeLevelUp() { document.getElementById('levelup-overlay').classList.add('hidden'); }

function toggleWeekdays() {
  document.getElementById('weekday-picker').classList.toggle(
    'hidden', document.getElementById('item-frequency').value !== 'custom'
  );
}

/* ══ BOOT ══ */
document.addEventListener('DOMContentLoaded', () => {
  /* Auth tabs — очищаємо поля при переключенні */
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      clearAuthFields();
    });
  });

  /* Sidebar nav */
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('page-' + btn.dataset.page).classList.add('active');
    });
  });

  document.querySelectorAll('.wd').forEach(el => el.addEventListener('click', () => el.classList.toggle('selected')));
  document.getElementById('item-frequency').addEventListener('change', toggleWeekdays);

  /* Авто-логін */
  if (state.token && state.user) showApp();
});
