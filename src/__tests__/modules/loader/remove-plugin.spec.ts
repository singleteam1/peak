import { spinner } from '@clack/prompts';
import { setupConsoleLogs } from '__tests__/setup/setup-logs';
import { validate } from 'class-validator';
import { fail, Website } from 'common';
import { accent, lime, warn } from 'common/constants';
import { LogOutput } from 'common/utils';
import { RemovePluginHandler } from 'modules/loader/handlers/remove-plugin.handler';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('common', () => ({
	fail: 'mock-fail-symbol',
	Website: 'https://example.com',
}));

vi.mock('common/constants', () => ({
	warn: {
		bold: vi.fn((text) => `WARN_BOLD[${text}]`),
	},
	accent: {
		bold: vi.fn((text) => `ACCENT_BOLD[${text}]`),
	},
	lime: vi.fn((text) => `LIME[${text}]`),
}));

vi.mock('common/utils', () => ({
	LogOutput: {
		LogValidationError: vi.fn(),
		LogError: vi.fn(),
	},
}));

describe('RemovePluginHandler', () => {
	let configServiceMock: any;
	let handler: RemovePluginHandler;
	let mockSpinner: any;

	beforeEach(() => {
		configServiceMock = {
			getConfig: vi.fn().mockResolvedValue({ projects: [] }),
			setConfig: vi.fn().mockResolvedValue(undefined),
		};

		mockSpinner = {
			start: vi.fn(),
			stop: vi.fn(),
			message: vi.fn(),
		};
		vi.mocked(spinner).mockReturnValue(mockSpinner);
		vi.mocked(validate).mockResolvedValue([]);
		setupConsoleLogs();

		handler = new RemovePluginHandler(configServiceMock);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render successful message with formatted strings', () => {
		handler.renderSuccessfullMessage('my-plugin');

		const expectedMessage =
			`WARN_BOLD[Plugin my-plugin was successfully removed!]` +
			`\n\nAdd custom plugins LIME[peak plugin] or` +
			`\nReset all config entirely LIME[peak reset]` +
			`\n\nDiscover ACCENT_BOLD[https://example.com] to check the documentation\n`;

		expect(console.log).toHaveBeenCalledWith(expectedMessage);
		expect(warn.bold).toHaveBeenCalledWith(
			'Plugin my-plugin was successfully removed!',
		);
		expect(lime).toHaveBeenCalledWith('peak plugin');
		expect(lime).toHaveBeenCalledWith('peak reset');
		expect(accent.bold).toHaveBeenCalledWith(Website);
	});

	it('should render validation errors correctly', () => {
		const mockErrors = [
			{
				constraints: {
					isString: 'key must be a string',
					isNotEmpty: 'key cannot be empty',
				},
			},
			{ constraints: { minLength: 'key is too short' } },
		] as any;

		handler.renderValidationErrors(mockErrors);

		expect(LogOutput.LogValidationError).toHaveBeenCalledTimes(2);
		expect(LogOutput.LogValidationError).toHaveBeenNthCalledWith(
			1,
			'key must be a string, key cannot be empty',
		);
		expect(LogOutput.LogValidationError).toHaveBeenNthCalledWith(
			2,
			'key is too short',
		);
	});

	it('handle should stop and render errors if DTO validation fails', async () => {
		const validationErrors = [{ constraints: { error: 'invalid dto' } }] as any;
		vi.mocked(validate).mockResolvedValueOnce(validationErrors);

		await handler.handle(['invalid-key'], {} as any);

		expect(mockSpinner.start).toHaveBeenCalledWith(
			'Removing plugin from config',
		);
		expect(mockSpinner.stop).toHaveBeenCalledWith(fail);
		expect(LogOutput.LogValidationError).toHaveBeenCalledWith('invalid dto');
		expect(configServiceMock.getConfig).not.toHaveBeenCalled();
	});

	it('handle should remove plugin and update config on valid input', async () => {
		configServiceMock.getConfig.mockResolvedValueOnce({
			projects: [
				{ key: 'plugin-1', url: 'https://github.com/plugin-1' },
				{ key: 'plugin-to-remove', url: 'https://github.com/plugin-2' },
				{ key: 'plugin-3', url: 'https://github.com/plugin-3' },
			],
		});

		await handler.handle(['plugin-to-remove'], {} as any);

		expect(mockSpinner.start).toHaveBeenCalledWith(
			'Removing plugin from config',
		);

		expect(configServiceMock.setConfig).toHaveBeenCalledWith({
			projects: [
				{ key: 'plugin-1', url: 'https://github.com/plugin-1' },
				{ key: 'plugin-3', url: 'https://github.com/plugin-3' },
			],
		});

		expect(mockSpinner.stop).toHaveBeenCalledWith('Success!');
		expect(console.log).toHaveBeenCalled(); // Triggered by renderSuccessfullMessage
	});

	it('handle should successfully complete even if the plugin key does not exist in the config', async () => {
		configServiceMock.getConfig.mockResolvedValueOnce({
			projects: [{ key: 'plugin-1', url: 'https://github.com/plugin-1' }],
		});

		await handler.handle(['non-existent-plugin'], {} as any);

		// It should filter and overwrite the same exact array
		expect(configServiceMock.setConfig).toHaveBeenCalledWith({
			projects: [{ key: 'plugin-1', url: 'https://github.com/plugin-1' }],
		});

		expect(mockSpinner.stop).toHaveBeenCalledWith('Success!');
	});

	it('handle should not call setConfig if config.projects is undefined', async () => {
		// Simulate config missing the projects array
		configServiceMock.getConfig.mockResolvedValueOnce({});

		await handler.handle(['some-key'], {} as any);

		expect(configServiceMock.setConfig).not.toHaveBeenCalled();
		expect(mockSpinner.stop).toHaveBeenCalledWith('Success!');
	});
});
