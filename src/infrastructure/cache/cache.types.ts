export interface ICache {
	get<T>(key: string): Promise<T | null>;
	set<T>(key: string, value: T): Promise<void>;
	has(key: string): Promise<boolean>;
	delete(key: string): Promise<void>;
	clear(): Promise<void>;
	get cacheDirectory(): string;
}
