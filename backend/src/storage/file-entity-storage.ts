import { Logger } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { EntityStorage } from './entity-storage';

export class FileEntityStorage<T> implements EntityStorage<T> {
  constructor(private readonly filePath: string, private readonly logger: Logger) {}

  async load(): Promise<T[]> {
    try {
      const directory = path.dirname(this.filePath);
      await fs.mkdir(directory, { recursive: true });
      const raw = await fs.readFile(this.filePath, 'utf8').catch((error) => {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return '';
        }
        throw error;
      });
      if (!raw.trim()) {
        return [];
      }
      const parsed = JSON.parse(raw) as T[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      this.logger.warn(
        `Failed to load data from ${this.filePath}: ${(error as Error).message}`,
      );
      return [];
    }
  }

  async save(records: T[]): Promise<void> {
    try {
      const directory = path.dirname(this.filePath);
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(this.filePath, JSON.stringify(records, null, 2), 'utf8');
    } catch (error) {
      this.logger.error(
        `Failed to persist data to ${this.filePath}: ${(error as Error).message}`,
      );
    }
  }
}

