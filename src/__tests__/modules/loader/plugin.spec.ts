import { spinner } from '@clack/prompts';
import { validate } from 'class-validator';
import { Website } from 'common';
import { accent, lime, warn } from 'common/constants';
import { LogOutput } from 'common/utils';
import { Framework } from 'data/config';
import { PluginHandler } from 'modules/loader/handlers/plugin.handler';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// 1. Setup Mocks
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

vi.mock('data/config', () => ({
	Framework: { NET: 'NET', Node: 'NodeJs' }, // Mocked Framework enum structure
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
			singleSelect: vi.fn(),
		};

		mockSpinner = {
			start: vi.fn(),
			stop: vi.fn(),
		};
		vi.mocked(spinner).mockReturnValue(mockSpinner);

		vi.mocked(validate).mockResolvedValue([]);

		vi.spyOn(console, 'log').mockImplementation(() => {});

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
		handler.renderSuccessfullMessage('my-plugin');

		const expectedMessage =
			`WARN_BOLD[\nConfig my-plugin was successfully added.]` +
			`\n\nPull the project LIME[peak pull my-plugin]\n\n` +
			`Discover ACCENT_BOLD[https://example.com] to check the documentation\n`;

		expect(console.log).toHaveBeenCalledWith(expectedMessage);
		expect(warn.bold).toHaveBeenCalledWith(
			'\nConfig my-plugin was successfully added.',
		);
		expect(lime).toHaveBeenCalledWith('peak pull my-plugin');
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
		interactiveServiceMock.singleSelect.mockResolvedValueOnce(Framework.Node);

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
		expect(configServiceMock.setConfig).toHaveBeenCalled(); // Reached the end successfully
	});

	it('handle should log and return early if DTO validation fails', async () => {
		const validationErrors = [{ constraints: { error: 'invalid dto' } }] as any;
		vi.mocked(validate).mockResolvedValueOnce(validationErrors);

		await handler.handle(['my-key', 'https://github.com/repo'], {} as any);

		expect(LogOutput.LogValidationError).toHaveBeenCalledWith('invalid dto');
		expect(configServiceMock.getConfig).not.toHaveBeenCalled();
		expect(mockSpinner.start).not.toHaveBeenCalled(); // Spinner shouldn't start on early fail
	});

	it('handle should log error and return early if a plugin with the key already exists (case-insensitive)', async () => {
		configServiceMock.getConfig.mockResolvedValueOnce({
			projects: [{ key: 'eXiStInG-KeY', url: 'https://github.com/old' }],
		});

		await handler.handle(['ExIsTiNg-kEy', 'https://github.com/new'], {} as any);

		expect(LogOutput.LogError).toHaveBeenCalledWith(
			'Plugin with this key already exist',
		);
		expect(interactiveServiceMock.singleSelect).not.toHaveBeenCalled();
		expect(mockSpinner.start).not.toHaveBeenCalled();
	});

	it('handle should log error and return early if URL is not referenced to git', async () => {
		await handler.handle(['my-key', 'https://invalid.com/repo'], {} as any);

		expect(LogOutput.LogValidationError).toHaveBeenCalledWith(
			'Url is not referenced to git.',
		);
		expect(interactiveServiceMock.singleSelect).not.toHaveBeenCalled();
		expect(mockSpinner.start).not.toHaveBeenCalled();
	});

	it('handle should successfully update config with selected framework and stop spinner', async () => {
		configServiceMock.getConfig.mockResolvedValueOnce({
			projects: [{ key: 'old-key', url: 'https://github.com/old' }],
		});
		interactiveServiceMock.singleSelect.mockResolvedValueOnce(Framework.NET);

		const envMock = {} as any;
		await handler.handle(['new-key', 'https://github.com/new'], envMock);

		// Verify framework prompt
		expect(interactiveServiceMock.singleSelect).toHaveBeenCalledWith({
			message: 'Select framework',
			options: [
				{ label: '.NET', value: Framework.NET },
				{ label: 'NodeJs', value: Framework.Node },
			],
		});

		expect(mockSpinner.start).toHaveBeenCalledWith('Updating config');

		// Verify config formatting and save
		expect(configServiceMock.setConfig).toHaveBeenCalledWith({
			projects: [
				{ key: 'old-key', url: 'https://github.com/old' },
				{
					key: 'new-key',
					url: 'https://github.com/new',
					metadata: { framework: Framework.NET },
				},
			],
		});

		expect(mockSpinner.stop).toHaveBeenCalledWith('Success!');
		expect(console.log).toHaveBeenCalled(); // Triggered by renderSuccessfullMessage
	});
});
