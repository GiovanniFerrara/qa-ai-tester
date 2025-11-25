import { Injectable } from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import path from 'node:path';

type FileContext = {
  filePath: string;
  context: string;
  logger: LoggerService;
};

type ReadArrayOptions<T> = FileContext & {
  fallback?: T[];
};

type WriteOptions<T> = FileContext & {
  data: T;
};

@Injectable()
export class FsDatabaseService {
  async readArray<T>({ fallback, ...context }: ReadArrayOptions<T>): Promise<T[]> {
    const defaultValue: T[] = fallback ?? [];
    const payload = await this.readJson<T[]>(context);
    if (Array.isArray(payload)) {
      return payload;
    }
    if (payload !== undefined) {
      context.logger.warn(
        `Expected ${context.context} file at ${context.filePath} to contain an array. Returning fallback value instead.`,
      );
    }
    return defaultValue;
  }

  async write<T>({ data, ...context }: WriteOptions<T>): Promise<void> {
    const { filePath, context: label, logger } = context;
    try {
      await this.ensureDirectory(path.dirname(filePath));
      const serialized = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, `${serialized}\n`, 'utf8');
    } catch (error) {
      logger.error(
        `Failed to write ${label} data to ${filePath}: ${this.getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  private async readJson<T>(context: FileContext): Promise<T | undefined> {
    const { filePath, context: label, logger } = context;
    try {
      const contents = await fs.readFile(filePath, 'utf8');
      return JSON.parse(contents) as T;
    } catch (error) {
      if (this.isMissingFileError(error)) {
        logger.log(`No ${label} file found at ${filePath}; returning fallback value.`);
        return undefined;
      }
      logger.error(
        `Failed to read ${label} data from ${filePath}: ${this.getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  private async ensureDirectory(directoryPath: string): Promise<void> {
    await fs.mkdir(directoryPath, { recursive: true });
  }

  private isMissingFileError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    );
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

