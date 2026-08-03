import { spinner } from '@clack/prompts';
import { validate } from 'class-validator';
import { accent, lime, Website, warn } from 'common';
import { LogOutput } from 'common/utils';
import { getFileContent } from 'common/utils/read-file';
import { ImportHandlerHandler } from 'modules/loader/handlers/import-config.handler';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('common', () => ({
	Website: 'https://example.com',
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

vi.mock('common/utils/read-file', () => ({
	getFileContent: vi.fn(),
}));

describe('ImportHandlerHandler', () => {
	let configServiceMock: any;
	let interactiveServiceMock: any;
	let explorerMock: any;
	let handler: ImportHandlerHandler;
	let mockSpinner: any;

	const mockEnv = { calledDir: '/mock/dir' } as any;

	beforeEach(() => {
		configServiceMock = {
			setConfig: vi.fn().mockResolvedValue(true),
		};

		interactiveServiceMock = {
			confirmAction: vi.fn().mockResolvedValue(true),
			prompt: vi.fn(),
		};

		explorerMock = {
			exists: vi.fn().mockResolvedValue(true),
		};

		mockSpinner = {
			start: vi.fn(),
			stop: vi.fn(),
		};
		vi.mocked(spinner).mockReturnValue(mockSpinner);

		vi.mocked(validate).mockResolvedValue([]);
		vi.spyOn(console, 'log').mockImplementation(() => {});

		handler = new ImportHandlerHandler(
			configServiceMock,
			interactiveServiceMock,
			explorerMock,
		);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render successful message with formatted strings', () => {
		handler.renderSuccessfullMessage();

		const expectedMessage =
			`WARN_BOLD[\nConfig was successfully imported.]` +
			`\n\nAdd custom plugins LIME[peak plugin]\n\n` +
			`Discover ACCENT_BOLD[https://example.com] to check the documentation\n`;

		expect(console.log).toHaveBeenCalledWith(expectedMessage);
		expect(warn.bold).toHaveBeenCalledWith(
			'\nConfig was successfully imported.',
		);
		expect(lime).toHaveBeenCalledWith('peak plugin');
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
		] as any;

		handler.renderValidationErrors(mockErrors);

		expect(LogOutput.LogValidationError).toHaveBeenCalledTimes(1);
		expect(LogOutput.LogValidationError).toHaveBeenCalledWith(
			'must be a string, cannot be empty',
		);
	});

	it('handle should log error and return early if user cancels confirmation', async () => {
		interactiveServiceMock.confirmAction.mockResolvedValueOnce(false);

		await handler.handle(['config.json'], mockEnv);

		expect(interactiveServiceMock.confirmAction).toHaveBeenCalledWith(
			'Are you sure you want to import a new config?',
			true,
		);
		expect(LogOutput.LogError).toHaveBeenCalledWith('Cancelled.');
		expect(interactiveServiceMock.prompt).not.toHaveBeenCalled();
		expect(explorerMock.exists).not.toHaveBeenCalled();
	});

	it('handle should prompt for config name if not provided in args', async () => {
		interactiveServiceMock.prompt.mockResolvedValueOnce('prompted-config.json');
		vi.mocked(getFileContent).mockResolvedValueOnce({
			success: true,
			output: '{}',
		} as any);

		await handler.handle([], mockEnv);

		expect(interactiveServiceMock.prompt).toHaveBeenCalledWith(
			'Enter config name:',
		);
		expect(explorerMock.exists).toHaveBeenCalledWith(
			join('/mock/dir', 'prompted-config.json'),
		);
	});

	it('handle should render validation errors and return if DTO validation fails', async () => {
		const validationErrors = [{ constraints: { error: 'invalid dto' } }] as any;
		vi.mocked(validate).mockResolvedValueOnce(validationErrors);

		await handler.handle(['invalid-name'], mockEnv);

		expect(LogOutput.LogValidationError).toHaveBeenCalledWith('invalid dto');
		expect(explorerMock.exists).not.toHaveBeenCalled();
	});

	it('handle should log error and return if the config file does not exist', async () => {
		explorerMock.exists.mockResolvedValueOnce(false);

		await handler.handle(['missing-config.json'], mockEnv);

		expect(explorerMock.exists).toHaveBeenCalledWith(
			join('/mock/dir', 'missing-config.json'),
		);
		expect(LogOutput.LogError).toHaveBeenCalledWith(
			'Config does not exist by this name: missing-config.json',
		);
		expect(mockSpinner.start).not.toHaveBeenCalled();
	});

	it('handle should stop spinner with Failed and log error if reading file fails', async () => {
		vi.mocked(getFileContent).mockResolvedValueOnce({
			success: false,
			output: '',
		} as any);

		await handler.handle(['unreadable-config.json'], mockEnv);

		expect(mockSpinner.start).toHaveBeenCalledWith('Importing config...');
		expect(mockSpinner.stop).toHaveBeenCalledWith('Failed');
		expect(LogOutput.LogError).toHaveBeenCalledWith(
			'Cannot read the config file.',
		);
		expect(configServiceMock.setConfig).not.toHaveBeenCalled();
	});

	it('handle should stop spinner with Failed and log error if parsing config JSON fails', async () => {
		vi.mocked(getFileContent).mockResolvedValueOnce({
			success: true,
			output: 'invalid-json',
		} as any);

		await handler.handle(['bad-json.json'], mockEnv);

		expect(mockSpinner.start).toHaveBeenCalledWith('Importing config...');
		expect(mockSpinner.stop).toHaveBeenCalledWith('Failed');
		expect(LogOutput.LogError).toHaveBeenCalledWith(
			'Failed to parse config file. Ensure it is valid JSON.',
		);
		expect(configServiceMock.setConfig).not.toHaveBeenCalled();
	});

	it('handle should stop spinner with Failed and log error if saving new config fails', async () => {
		vi.mocked(getFileContent).mockResolvedValueOnce({
			success: true,
			output: '{"projects": []}',
		} as any);
		configServiceMock.setConfig.mockResolvedValueOnce(false);

		await handler.handle(['valid-config.json'], mockEnv);

		expect(mockSpinner.start).toHaveBeenCalledWith('Importing config...');
		expect(configServiceMock.setConfig).toHaveBeenCalledWith({ projects: [] });
		expect(mockSpinner.stop).toHaveBeenCalledWith('Failed');
		expect(LogOutput.LogError).toHaveBeenCalledWith(
			'Cannot save the new config.',
		);
	});

	it('handle should successfully import config and stop spinner on success', async () => {
		vi.mocked(getFileContent).mockResolvedValueOnce({
			success: true,
			output: '{"projects": []}',
		} as any);

		await handler.handle(['valid-config.json'], mockEnv);

		expect(mockSpinner.start).toHaveBeenCalledWith('Importing config...');
		expect(configServiceMock.setConfig).toHaveBeenCalledWith({ projects: [] });
		expect(mockSpinner.stop).toHaveBeenCalledWith('Success!');
		expect(console.log).toHaveBeenCalled(); // Triggered by renderSuccessfullMessage
	});
});
