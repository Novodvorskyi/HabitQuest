/* ═══════════════════════════════════════════════════
   broker.js — RabbitMQ обгортка (topic exchange)
═══════════════════════════════════════════════════ */

const amqp = require('amqplib');

const EXCHANGE      = 'habitquest.exchange';
const EXCHANGE_TYPE = 'topic';

let connection = null;
let channel    = null;

async function connect() {
  if (channel) return channel;
  connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
  channel    = await connection.createChannel();
  await channel.assertExchange(EXCHANGE, EXCHANGE_TYPE, { durable: true });
  console.log('[RabbitMQ] ✅ Підключено, exchange:', EXCHANGE);
  connection.on('error', err => console.error('[RabbitMQ] Помилка:', err.message));
  connection.on('close', ()  => console.warn('[RabbitMQ] З\'єднання закрито'));
  return channel;
}

async function publish(routingKey, payload) {
  const ch = await connect();
  ch.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), { persistent: true });
  console.log(`[RabbitMQ] 📨 ${routingKey}`, payload);
}

async function subscribe(queueName, routingKeys, handler) {
  const ch = await connect();
  await ch.assertQueue(queueName, { durable: true });
  for (const key of routingKeys) {
    await ch.bindQueue(queueName, EXCHANGE, key);
    console.log(`[RabbitMQ] 📥 ${queueName} → ${key}`);
  }
  ch.consume(queueName, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      await handler(msg.fields.routingKey, payload);
      ch.ack(msg);
    } catch (err) {
      console.error(`[RabbitMQ] Помилка в ${queueName}:`, err.message);
      ch.nack(msg, false, false);
    }
  });
}

module.exports = { connect, publish, subscribe };
