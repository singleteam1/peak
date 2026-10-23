import { spinner } from '@clack/prompts';
import { accent, lime, Website, warn } from 'common';
import { LogOutput } from 'common/utils';
import { ResetHandler } from 'modules/loader/handlers/reset.handler';
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
		LogInfo: vi.fn(),
	},
}));

vi.mock('data/config', () => ({
	configKey: 'mock-config-key',
	config: { projects: [], version: '1.0.0' },
}));

describe('ResetHandler', () => {
	let cacheMock: any;
	let interactiveMock: any;
	let handler: ResetHandler;
	let mockSpinner: any;

	beforeEach(() => {
		// Initialize mock services
		cacheMock = {
			set: vi.fn().mockResolvedValue(undefined),
		};

		interactiveMock = {
			confirmAction: vi.fn(),
		};

		// Initialize mock spinner
		mockSpinner = {
			start: vi.fn(),
			stop: vi.fn(),
		};
		vi.mocked(spinner).mockReturnValue(mockSpinner);

		// Spy on console.log
		vi.spyOn(console, 'log').mockImplementation(() => {});

		handler = new ResetHandler(cacheMock, interactiveMock);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render successful message with formatted strings', () => {
		handler.renderSuccessfullMessage();

		const expectedMessage =
			`WARN_BOLD[\nConfig was successfully reset.]\n\n` +
			`Add custom plugins LIME[peak plugin]\n\n` +
			`Discover ACCENT_BOLD[https://example.com] to check the documentation\n`;

		expect(console.log).toHaveBeenCalledWith(expectedMessage);
		expect(warn.bold).toHaveBeenCalledWith('\nConfig was successfully reset.');
		expect(lime).toHaveBeenCalledWith('peak plugin');
		expect(accent.bold).toHaveBeenCalledWith(Website);
	});

	it('handle should log info and return if user cancels the confirmation', async () => {
		interactiveMock.confirmAction.mockResolvedValueOnce(false);

		await handler.handle([], {} as any);

		expect(interactiveMock.confirmAction).toHaveBeenCalledWith(
			'Are you sure you want to reset the config?',
			false,
		);
		expect(LogOutput.LogInfo).toHaveBeenCalledWith('Cancelling.');
		expect(mockSpinner.start).not.toHaveBeenCalled();
		expect(cacheMock.set).not.toHaveBeenCalled();
	});

	it('handle should reset config, update cache, and log success if user confirms', async () => {
		interactiveMock.confirmAction.mockResolvedValueOnce(true);

		await handler.handle([], {} as any);

		expect(interactiveMock.confirmAction).toHaveBeenCalledWith(
			'Are you sure you want to reset the config?',
			false,
		);
		expect(mockSpinner.start).toHaveBeenCalledWith(
			'Pulling nestjs application',
		);

		const expectedConfigString = JSON.stringify({
			projects: [],
			version: '1.0.0',
		});
		expect(cacheMock.set).toHaveBeenCalledWith(
			'mock-config-key',
			expectedConfigString,
		);

		expect(mockSpinner.stop).toHaveBeenCalledWith('Success!');
		expect(console.log).toHaveBeenCalled();
	});
});
