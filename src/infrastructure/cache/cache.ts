import envPaths from 'env-paths';
import fs from 'fs-extra';
import path from 'path';
import type { ICache } from './cache.types';

interface CacheEntry<T> {
  value: T;
}

export class DiskCache implements ICache {
  private readonly cacheDir: string;

  public constructor(appName: string) {
    this.cacheDir = envPaths(appName).cache;
  }

  private getFilePath(key: string): string {
    const safeKey = key.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    return path.join(this.cacheDir, `${safeKey}.json`);
  }

  public async get<T>(key: string): Promise<T | null> {
    const filePath = this.getFilePath(key);

    if (!(await fs.pathExists(filePath))) return null;

    try {
      const entry: CacheEntry<T> = await fs.readJson(filePath);
      return entry.value;
    } catch (error) {
      return null;
    }
  }

  public async set<T>(key: string, value: T): Promise<void> {
    await fs.ensureDir(this.cacheDir);

    const entry: CacheEntry<T> = {
      value,
    };
    await fs.writeJson(this.getFilePath(key), entry);
  }

  public async has(key: string): Promise<boolean> {
    const val = await this.get(key);
    return val !== null;
  }

  public async delete(key: string): Promise<void> {
    await fs.remove(this.getFilePath(key));
  }

  public async clear(): Promise<void> {
    await fs.emptyDir(this.cacheDir);
  }

  public get cacheDirectory(): string {
    return this.cacheDir;
  }
}
