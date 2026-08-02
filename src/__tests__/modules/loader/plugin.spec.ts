import { spinner } from '@clack/prompts';
import { setupConsoleLogs } from '__tests__/setup';
import { validate } from 'class-validator';
import { fail, Website } from 'common';
import { accent, warn } from 'common/constants';
import { LogOutput } from 'common/utils';
import { PluginHandler } from 'modules/loader/handlers/plugin.handler';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clack/prompts', () => ({
	spinner: vi.fn(),
}));

vi.mock('class-transformer', async (importOriginal) => {
	const actual = await importOriginal<typeof import('class-transformer')>();
	return {
		...actual,
		plainToInstance: vi.fn((cls, obj) => obj),
	};
});

vi.mock('class-validator', async (importOriginal) => {
	const actual = await importOriginal<typeof import('class-validator')>();
	return {
		...actual,
		validate: vi.fn(),
	};
});

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
}));

vi.mock('common/utils', () => ({
	LogOutput: {
		LogValidationError: vi.fn(),
		LogError: vi.fn(),
	},
}));

describe('PluginHandler', () => {
	let configServiceMock: any;
	let interactiveServiceMock: any;
	let handler: PluginHandler;
	let mockSpinner: any;

	beforeEach(() => {
		configServiceMock = {
			getConfig: vi.fn().mockResolvedValue({ projects: [] }),
			setConfig: vi.fn().mockResolvedValue(undefined),
		};

		interactiveServiceMock = {
			prompt: vi.fn(),
		};

		mockSpinner = {
			start: vi.fn(),
			stop: vi.fn(),
			message: vi.fn(),
		};
		vi.mocked(spinner).mockReturnValue(mockSpinner);

		vi.mocked(validate).mockResolvedValue([]);
		setupConsoleLogs();

		handler = new PluginHandler(configServiceMock, interactiveServiceMock);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should return true for valid GitHub or GitLab URLs', () => {
		expect(handler.validateUrlToGit('https://github.com/repo')).toBe(true);
		expect(handler.validateUrlToGit('https://gitlab.com/repo')).toBe(true);
	});

	it('should return false for invalid Git URLs', () => {
		expect(handler.validateUrlToGit('https://bitbucket.org/repo')).toBe(false);
		expect(handler.validateUrlToGit('http://github.com/repo')).toBe(false);
		expect(handler.validateUrlToGit('invalid-url')).toBe(false);
	});

	it('should render successful message with formatted strings', () => {
		handler.renderSuccessfullMessage();

		const expectedMessage =
			`WARN_BOLD[\nConfig was successfully reset.]\n\n` +
			`Discover ACCENT_BOLD[https://example.com] to check the documentation\n`;

		expect(console.log).toHaveBeenCalledWith(expectedMessage);
		expect(warn.bold).toHaveBeenCalledWith('\nConfig was successfully reset.');
		expect(accent.bold).toHaveBeenCalledWith(Website);
	});

	it('should render validation errors correctly', () => {
		const mockErrors = [
			{
				constraints: {
					isString: 'must be a string',
					isNotEmpty: 'cannot be empty',
				},
			},
			{ constraints: { isUrl: 'must be a URL' } },
		] as any;

		handler.renderValidationErrors(mockErrors);

		expect(LogOutput.LogValidationError).toHaveBeenCalledTimes(2);
		expect(LogOutput.LogValidationError).toHaveBeenNthCalledWith(
			1,
			'must be a string, cannot be empty',
		);
		expect(LogOutput.LogValidationError).toHaveBeenNthCalledWith(
			2,
			'must be a URL',
		);
	});

	it('handle should prompt for key and url if they are not provided in args', async () => {
		interactiveServiceMock.prompt
			.mockResolvedValueOnce('prompted-key')
			.mockResolvedValueOnce('https://github.com/prompted');

		await handler.handle([], {} as any);

		expect(interactiveServiceMock.prompt).toHaveBeenCalledTimes(2);
		expect(interactiveServiceMock.prompt).toHaveBeenNthCalledWith(
			1,
			'Enter the plugin name',
		);
		expect(interactiveServiceMock.prompt).toHaveBeenNthCalledWith(
			2,
			'Enter the repo url',
		);
		expect(configServiceMock.setConfig).toHaveBeenCalled();
	});

	it('handle should stop and render errors if DTO validation fails', async () => {
		const validationErrors = [{ constraints: { error: 'invalid dto' } }] as any;
		vi.mocked(validate).mockResolvedValueOnce(validationErrors);

		await handler.handle(['my-key', 'https://github.com/repo'], {} as any);

		expect(mockSpinner.stop).toHaveBeenCalledWith(fail);
		expect(LogOutput.LogValidationError).toHaveBeenCalledWith('invalid dto');
		expect(configServiceMock.getConfig).not.toHaveBeenCalled();
	});

	it('handle should stop and log error if URL is not referenced to git', async () => {
		await handler.handle(['my-key', 'https://invalid.com/repo'], {} as any);

		expect(mockSpinner.stop).toHaveBeenCalledWith(fail);
		expect(LogOutput.LogValidationError).toHaveBeenCalledWith(
			'Url is not referenced to git.',
		);
		expect(configServiceMock.getConfig).not.toHaveBeenCalled();
	});

	it('handle should stop and log error if plugin with the key already exists', async () => {
		configServiceMock.getConfig.mockResolvedValueOnce({
			projects: [{ key: 'existing-key', url: 'https://github.com/old' }],
		});

		await handler.handle(['EXISTING-KEY', 'https://github.com/new'], {} as any);

		expect(mockSpinner.stop).toHaveBeenCalledWith(fail);
		expect(LogOutput.LogError).toHaveBeenCalledWith(
			'Plugin with this key already exist',
		);
		expect(configServiceMock.setConfig).not.toHaveBeenCalled();
	});

	it('handle should successfully update config and stop spinner on valid input', async () => {
		configServiceMock.getConfig.mockResolvedValueOnce({
			projects: [{ key: 'old-key', url: 'https://github.com/old' }],
		});

		const envMock = {} as any;
		await handler.handle(['new-key', 'https://github.com/new'], envMock);

		expect(mockSpinner.start).toHaveBeenCalledWith('Validating');
		expect(mockSpinner.message).toHaveBeenCalledWith('Updating config');

		expect(configServiceMock.setConfig).toHaveBeenCalledWith({
			projects: [
				{ key: 'old-key', url: 'https://github.com/old' },
				{ key: 'new-key', url: 'https://github.com/new' },
			],
		});

		expect(mockSpinner.stop).toHaveBeenCalledWith('Success!');
		expect(console.log).toHaveBeenCalled();
	});
});
