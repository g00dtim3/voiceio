/** Limits concurrent async tasks to `max` simultaneous executions. */
export class Semaphore {
  private slots: number;
  private queue: (() => void)[] = [];

  constructor(max: number) {
    this.slots = max;
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this._acquire();
    try {
      return await fn();
    } finally {
      this._release();
    }
  }

  private _acquire(): Promise<void> {
    if (this.slots > 0) {
      this.slots--;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => this.queue.push(resolve));
  }

  private _release(): void {
    if (this.queue.length > 0) {
      this.queue.shift()!();
    } else {
      this.slots++;
    }
  }
}

/**
 * Runs fn(batch, batchIndex) for every batch in parallel,
 * with at most `concurrency` running at the same time.
 */
export async function processInParallel<T>(
  batches: T[][],
  concurrency: number,
  fn: (batch: T[], batchIndex: number) => Promise<void>
): Promise<void> {
  const sem = new Semaphore(concurrency);
  await Promise.all(batches.map((batch, i) => sem.run(() => fn(batch, i))));
}

/** Splits an array into chunks of at most `size` items. */
export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
