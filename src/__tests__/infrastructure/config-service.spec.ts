import { configKey, type IConfig } from 'data/config';
import { ConfigService } from 'infrastructure/configService/config.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the config key so it has a predictable value in tests
vi.mock('data/config', () => ({
	configKey: 'mock-config-key',
}));

describe('ConfigService', () => {
	let cacheMock: any;
	let service: ConfigService;

	beforeEach(() => {
		cacheMock = {
			get: vi.fn(),
			set: vi.fn(),
		};

		service = new ConfigService(cacheMock);
	});

	it('getConfig should fetch and parse the config from cache', async () => {
		const mockConfig: IConfig = {
			projects: [{ key: 'my-plugin', url: 'https://github.com/my/plugin' }],
		} as IConfig;
		cacheMock.get.mockResolvedValueOnce(JSON.stringify(mockConfig));

		const result = await service.getConfig();

		expect(cacheMock.get).toHaveBeenCalledWith(configKey);
		expect(result).toEqual(mockConfig);
	});

	it('setConfig should serialize, save config to cache, and return true on success', async () => {
		cacheMock.set.mockResolvedValueOnce(undefined);
		const newConfig: IConfig = {
			projects: [{ key: 'new-plugin', url: 'https://github.com/new/plugin' }],
		} as IConfig;

		const result = await service.setConfig(newConfig);

		expect(cacheMock.set).toHaveBeenCalledWith(
			configKey,
			JSON.stringify(newConfig),
		);
		expect(result).toBe(true);
	});

	it('setConfig should return false if an error occurs while saving to cache', async () => {
		cacheMock.set.mockRejectedValueOnce(new Error('Cache write failed'));
		const newConfig: IConfig = { projects: [] } as any;

		const result = await service.setConfig(newConfig);

		expect(cacheMock.set).toHaveBeenCalledWith(
			configKey,
			JSON.stringify(newConfig),
		);
		expect(result).toBe(false);
	});
});
