export interface EntityStorage<T> {
  load(): Promise<T[]>;
  save(records: T[]): Promise<void>;
}

