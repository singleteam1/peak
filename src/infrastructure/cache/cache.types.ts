import type { CacheTTL } from 'common/cache';

export interface ICache {
	get<T>(key: string): Promise<T | null>;
	set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
	has(key: string): Promise<boolean>;
	delete(key: string): Promise<void>;
	clear(): Promise<void>;
	get cacheDirectory(): string;
}

export interface IProductCache extends ICache {
	persistFile(
		sourcePath: string,
		persistanceKey: string,
		fileName: string,
		ttl: CacheTTL,
	): Promise<boolean>;
}
