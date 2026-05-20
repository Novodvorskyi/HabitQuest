/* ═══════════════════════════════════════════════════════════
   server.js — точка входу
   Лише підключення, маршрути та запуск.
   Вся логіка — в controllers/ та repositories/
═══════════════════════════════════════════════════════════ */

require('dotenv').config();

const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const swaggerUi  = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const { connect: connectBroker } = require('./broker');
const { startAllServices }       = require('./services');
const auth = require('./middleware/auth');

/* ── Controllers ── */
const authCtrl    = require('./controllers/authController');
const userCtrl    = require('./controllers/userController');
const habitCtrl   = require('./controllers/habitController');
const taskCtrl    = require('./controllers/taskController');
const shopCtrl    = require('./controllers/shopController');
const historyCtrl = require('./controllers/historyController');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
const helmet = require('helmet');
app.use(helmet());

/* ══ Swagger ══ */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HabitQuest API',
      version: '1.0.0',
      description: 'REST API для трекера звичок із гейміфікацією. Подієво-орієнтована архітектура через RabbitMQ.',
    },
    servers: [{ url: 'http://localhost:5000' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
}));

/* ══ Маршрути ══ */

/* Auth */
app.post('/api/auth/register', authCtrl.register);
app.post('/api/auth/login',    authCtrl.login);

/* User */
app.get ('/api/user/me',           auth, userCtrl.getMe);
app.put ('/api/user/profile',      auth, userCtrl.updateProfile);
app.get ('/api/users/search',      auth, userCtrl.searchUsers);
app.get ('/api/users/following',   auth, userCtrl.getFollowing);
app.post('/api/users/:id/follow',  auth, userCtrl.toggleFollow);

/* Habits */
app.get   ('/api/habits',                 auth, habitCtrl.getAll);
app.post  ('/api/habits',                 auth, habitCtrl.create);
app.put   ('/api/habits/:id',             auth, habitCtrl.update);
app.delete('/api/habits/:id',             auth, habitCtrl.remove);
app.post  ('/api/habits/:id/complete',    auth, habitCtrl.complete);

/* Tasks */
app.get   ('/api/tasks',                  auth, taskCtrl.getAll);
app.post  ('/api/tasks',                  auth, taskCtrl.create);
app.put   ('/api/tasks/:id',              auth, taskCtrl.update);
app.delete('/api/tasks/:id',              auth, taskCtrl.remove);
app.post  ('/api/tasks/:id/complete',     auth, taskCtrl.complete);

/* Shop */
app.get ('/api/shop/frames',         auth, shopCtrl.getFrames);
app.post('/api/shop/buy/:frameId',   auth, shopCtrl.buyFrame);
app.post('/api/shop/equip/:frameId', auth, shopCtrl.equipFrame);

/* History */
app.get('/api/history', auth, historyCtrl.getHistory);

/* ══ Bootstrap ══ */
async function start() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('[MongoDB] ✅ Підключено');

  await connectBroker();
  await startAllServices();

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`[Express] ✅ http://localhost:${PORT}`);
    console.log(`[Swagger] 📖 http://localhost:${PORT}/api-docs`);
  });
}

start().catch(err => { console.error('❌', err.message); process.exit(1); });

module.exports = app; // для тестів
