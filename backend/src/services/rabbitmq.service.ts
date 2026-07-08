import amqp from 'amqplib';

class RabbitMQService {
  private connection: any = null;
  private channel: any = null;
  private isConnected = false;
  private url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

  constructor() {
    this.connect();
  }

  /**
   * Connect to RabbitMQ message broker
   */
  private async connect() {
    try {
      console.log(`[RabbitMQ] Connecting to ${this.url}...`);
      this.connection = await (amqp.connect(this.url) as any);
      this.channel = await this.connection.createChannel();
      this.isConnected = true;
      console.log('[RabbitMQ] Connected and channel created successfully.');

      this.connection.on('error', (err: any) => {
        console.error('[RabbitMQ] Connection error:', err.message);
        this.isConnected = false;
      });

      this.connection.on('close', () => {
        console.warn('[RabbitMQ] Connection closed. Attempting reconnect...');
        this.isConnected = false;
        setTimeout(() => this.connect(), 5000);
      });
    } catch (error: any) {
      console.warn(`[RabbitMQ] Failed to connect: ${error.message}. Continuing in offline mode.`);
      this.isConnected = false;
    }
  }

  /**
   * Publish a message to a queue
   */
  public async publishToQueue(queueName: string, data: any): Promise<boolean> {
    if (!this.isConnected || !this.channel) {
      console.warn(`[RabbitMQ] Offline. Simulating publish to queue "${queueName}":`, data);
      return false;
    }

    try {
      await this.channel.assertQueue(queueName, { durable: true });
      const payload = Buffer.from(JSON.stringify(data));
      this.channel.sendToQueue(queueName, payload, { persistent: true });
      console.log(`[RabbitMQ] Published message to queue "${queueName}":`, data);
      return true;
    } catch (error: any) {
      console.error(`[RabbitMQ] Failed to publish message: ${error.message}`);
      return false;
    }
  }
}

export const rabbitMQService = new RabbitMQService();
