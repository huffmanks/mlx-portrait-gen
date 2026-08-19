import type { Task } from "#/types";

export class SequentialQueue {
  private queue: Task<any>[] = [];
  private running = false;

  async add<T>(task: Task<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this.processNext();
    });
  }

  private async processNext() {
    if (this.running || this.queue.length === 0) return;
    this.running = true;
    const task = this.queue.shift();
    if (task) await task();
    this.running = false;
    this.processNext();
  }
}
