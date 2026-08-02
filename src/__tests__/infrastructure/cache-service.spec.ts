import envPaths from 'env-paths';
import fs from 'fs-extra';
import { DiskCache, type IExplorerService } from 'infrastructure';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the external dependencies
vi.mock('fs-extra');
vi.mock('env-paths');
vi.mock('node:path', () => ({
	default: {
		join: (...args: string[]) => args.join('/'),
	},
}));

describe('DiskCache', () => {
	const appName = 'test-app';
	const mockCacheDir = '/mock/cache/path';
	let cache: DiskCache;
	let mockExplorer: IExplorerService;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		(envPaths as any).mockReturnValue({ cache: mockCacheDir });

		mockExplorer = {
			createFolder: vi.fn(),
			copyFile: vi.fn(),
			exists: vi.fn(),
			delete: vi.fn(),
			createFile: vi.fn(),
			readFile: vi.fn(),
			rename: vi.fn(),
			moveFile: vi.fn()
		};

		cache = new DiskCache(appName);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('Should ensure the directory exists and write the JSON file', async () => {
		const key = 'user_123';
		const data = { name: 'John' };
		const expectedPath = `${mockCacheDir}/${key.toLowerCase()}.json`;

		await cache.set(key, data);

		expect(fs.ensureDir).toHaveBeenCalledWith(mockCacheDir);
		expect(fs.writeJson).toHaveBeenCalledWith(expectedPath, {
      value: data,
    });
	});

	it('Should return null if the file does not exist', async () => {
		(fs.pathExists as any).mockResolvedValue(false);
		const result = await cache.get('missing');
		expect(result).toBeNull();
	});

	it('Should return the value if it has not expired', async () => {
		const data = { foo: 'bar' };
		(fs.pathExists as any).mockResolvedValue(true);
		(fs.readJson as any).mockResolvedValue({
			value: data,
			expiresAt: Date.now() + 10000,
		});

		const result = await cache.get('key');
		expect(result).toEqual(data);
	});

	it('Should return null if JSON reading fails', async () => {
		(fs.pathExists as any).mockResolvedValue(true);
		(fs.readJson as any).mockRejectedValue(new Error('Corrupt JSON'));

		const result = await cache.get('corrupt');
		expect(result).toBeNull();
	});

	it('Should return true if valid item exists', async () => {
		(fs.pathExists as any).mockResolvedValue(true);
		(fs.readJson as any).mockResolvedValue({ value: 'yes', expiresAt: null });

		const exists = await cache.has('key');
		expect(exists).toBe(true);
	});

	it('Should empty the entire cache directory', async () => {
		await cache.clear();
		expect(fs.emptyDir).toHaveBeenCalledWith(mockCacheDir);
	});
});
