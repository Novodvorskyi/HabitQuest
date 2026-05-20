/* ═══════════════════════════════════
   models.js
═══════════════════════════════════ */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ── User ──
   nickname — унікальний, використовується і для входу, і як відображуване ім'я
   passwordHash — захешований пароль
*/
const UserSchema = new Schema({
  nickname:        { type: String, required: true, unique: true, trim: true },
  passwordHash:    { type: String, required: true },
  avatar:          { type: String, default: '' },
  bio:             { type: String, default: '' },
  xp:              { type: Number, default: 0 },
  level:           { type: Number, default: 1 },
  coins:           { type: Number, default: 0 },
  streak:          { type: Number, default: 0 },
  lastDate:        { type: String, default: '' },
  totalTasksDone:  { type: Number, default: 0 },
  totalHabitsDone: { type: Number, default: 0 },
  ownedFrames:     { type: [String], default: [] },
  activeFrame:     { type: String, default: '' },
  following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

/* ── Habit ── */
const HabitSchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name:        { type: String, required: true },
  description: { type: String, default: '' },
  difficulty:  { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  frequency:   { type: String, enum: ['daily', 'weekly', 'custom'], default: 'daily' },
  weekdays:    { type: [Number], default: [] },
}, { timestamps: true });

/* ── Task ── */
const TaskSchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name:        { type: String, required: true },
  description: { type: String, default: '' },
  difficulty:  { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  deadline:    { type: Date, default: null },
}, { timestamps: true });

/* ── EventLog ── */
const EventLogSchema = new Schema({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  eventType: { type: String, required: true },
  icon:      { type: String, default: '●' },
  action:    { type: String, required: true },
  detail:    { type: String, default: '' },
  xp:        { type: Number, default: 0 },
  coins:     { type: Number, default: 0 },
}, { timestamps: true });

module.exports = {
  User:     mongoose.model('User',     UserSchema),
  Habit:    mongoose.model('Habit',    HabitSchema),
  Task:     mongoose.model('Task',     TaskSchema),
  EventLog: mongoose.model('EventLog', EventLogSchema),
};
