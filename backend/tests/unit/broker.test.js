jest.mock('amqplib');
const amqp = require('amqplib');

let broker;

const mockChannel = {
  assertExchange: jest.fn().mockResolvedValue(true),
  assertQueue:    jest.fn().mockResolvedValue(true),
  bindQueue:      jest.fn().mockResolvedValue(true),
  publish:        jest.fn(),
  consume:        jest.fn(),
  ack:            jest.fn(),
  nack:           jest.fn(),
};

const mockConnection = {
  createChannel: jest.fn().mockResolvedValue(mockChannel),
  on:            jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  amqp.connect.mockResolvedValue(mockConnection);
  broker = require('../../broker');
});

describe('broker.connect()', () => {
  test('підключається до RabbitMQ', async () => {
    await broker.connect();
    expect(amqp.connect).toHaveBeenCalled();
    expect(mockConnection.createChannel).toHaveBeenCalled();
    expect(mockChannel.assertExchange).toHaveBeenCalledWith(
      'habitquest.exchange', 'topic', { durable: true }
    );
  });

  test('повторний виклик повертає той самий channel', async () => {
    await broker.connect();
    await broker.connect();
    expect(amqp.connect).toHaveBeenCalledTimes(1);
  });

  test('реєструє обробники error та close на connection', async () => {
    await broker.connect();
    expect(mockConnection.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockConnection.on).toHaveBeenCalledWith('close', expect.any(Function));
  });
});

describe('broker.publish()', () => {
  test('публікує повідомлення в exchange', async () => {
    await broker.publish('item.completed', { userId: '123', difficulty: 'easy' });
    expect(mockChannel.publish).toHaveBeenCalledWith(
      'habitquest.exchange',
      'item.completed',
      expect.any(Buffer),
      { persistent: true }
    );
  });

  test('серіалізує payload в JSON', async () => {
    const payload = { userId: 'abc', type: 'habit' };
    await broker.publish('test.key', payload);
    const call = mockChannel.publish.mock.calls[0];
    expect(JSON.parse(call[2].toString())).toEqual(payload);
  });
});

describe('broker.subscribe()', () => {
  test('створює чергу і прив\'язує routing keys', async () => {
    await broker.subscribe('test_queue', ['item.completed', 'level.up'], jest.fn());
    expect(mockChannel.assertQueue).toHaveBeenCalledWith('test_queue', { durable: true });
    expect(mockChannel.bindQueue).toHaveBeenCalledWith('test_queue', 'habitquest.exchange', 'item.completed');
    expect(mockChannel.bindQueue).toHaveBeenCalledWith('test_queue', 'habitquest.exchange', 'level.up');
    expect(mockChannel.consume).toHaveBeenCalled();
  });

  test('викликає handler з routingKey і payload', async () => {
    const handler = jest.fn().mockResolvedValue(true);
    mockChannel.consume.mockImplementation((queue, cb) => {
      cb({
        content: Buffer.from(JSON.stringify({ userId: '1' })),
        fields:  { routingKey: 'item.completed' },
      });
    });
    await broker.subscribe('q', ['item.completed'], handler);
    expect(handler).toHaveBeenCalledWith('item.completed', { userId: '1' });
    expect(mockChannel.ack).toHaveBeenCalled();
  });

  test('викликає nack при помилці в handler', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('fail'));
    mockChannel.consume.mockImplementation((queue, cb) => {
      cb({
        content: Buffer.from(JSON.stringify({})),
        fields:  { routingKey: 'item.completed' },
      });
    });
    await broker.subscribe('q', ['item.completed'], handler);
    expect(mockChannel.nack).toHaveBeenCalledWith(expect.anything(), false, false);
  });

  test('ігнорує null повідомлення', async () => {
    const handler = jest.fn();
    mockChannel.consume.mockImplementation((queue, cb) => { cb(null); });
    await broker.subscribe('q', ['item.completed'], handler);
    expect(handler).not.toHaveBeenCalled();
  });
});
