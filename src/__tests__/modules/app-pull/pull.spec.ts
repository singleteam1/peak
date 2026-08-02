import { note, spinner } from '@clack/prompts';
import chalk from 'chalk';
import { validate } from 'class-validator';
import { fail, lockfileList, Website } from 'common';
import { accent, lime, warn } from 'common/constants';
import { isNullOrWhiteSpace, LogOutput } from 'common/utils';
import { Framework } from 'data/config';
import { PullHandler } from 'modules/app-pull/handlers/pull.handler';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// 1. Setup Mocks
vi.mock('@clack/prompts', () => ({
	spinner: vi.fn(),
	note: vi.fn(),
}));

vi.mock('chalk', () => ({
	default: {
		bold: vi.fn((text) => `CHALK_BOLD[${text}]`),
	},
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
	lockfileList: [{ packageManager: 'npm' }, { packageManager: 'yarn' }],
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
	isNullOrWhiteSpace: vi.fn((str) => !str || str.trim() === ''),
}));

vi.mock('data/config', () => ({
	Framework: { Node: 'Node', Dotnet: 'Dotnet' },
}));

describe('PullHandler', () => {
	let configServiceMock: any;
	let interactiveMock: any;
	let psMock: any;
	let handler: PullHandler;
	let mockSpinner: any;

	const mockEnv = { calledDir: '/mock/dir' } as any;

	beforeEach(() => {
		configServiceMock = {
			getConfig: vi.fn().mockResolvedValue({ projects: [] }),
		};

		interactiveMock = {
			prompt: vi.fn(),
			confirmAction: vi.fn(),
			singleSelect: vi.fn(),
		};

		psMock = {
			execute: vi.fn().mockResolvedValue(undefined),
		};

		mockSpinner = {
			start: vi.fn(),
			stop: vi.fn(),
		};
		vi.mocked(spinner).mockReturnValue(mockSpinner);

		vi.mocked(validate).mockResolvedValue([]);
		vi.spyOn(console, 'log').mockImplementation(() => {});

		handler = new PullHandler(configServiceMock, interactiveMock, psMock);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renderSuccessfullMessage should output formatted strings', () => {
		handler.renderSuccessfullMessage('my-project');

		const expectedMessage =
			`WARN_BOLD[\nProject my-project pulled successfully!]` +
			`\n\nAdd custom plugins LIME[peak plugin]\n\n` +
			`Discover ACCENT_BOLD[https://example.com] to check the documentation\n`;

		expect(console.log).toHaveBeenCalledWith(expectedMessage);
	});

	it('renderValidationErrors should format and log errors', () => {
		const mockErrors = [
			{ constraints: { isString: 'must be a string' } },
		] as any;
		handler.renderValidationErrors(mockErrors);
		expect(LogOutput.LogValidationError).toHaveBeenCalledWith(
			'must be a string',
		);
	});

	it('validateKeyArg should return the key directly if valid', async () => {
		const result = await handler.validateKeyArg('existing-key');
		expect(result).toBe('existing-key');
		expect(interactiveMock.prompt).not.toHaveBeenCalled();
	});

	it('validateKeyArg should prompt user if key is null or whitespace', async () => {
		interactiveMock.prompt.mockResolvedValueOnce('prompted-key');
		const result = await handler.validateKeyArg('');

		expect(interactiveMock.prompt).toHaveBeenCalledWith('Enter the key');
		expect(result).toBe('prompted-key');
	});

	it('handleName should return null and render errors if DTO validation fails', async () => {
		interactiveMock.prompt.mockResolvedValueOnce('invalid name');
		vi.mocked(validate).mockResolvedValueOnce([
			{ constraints: { error: 'bad name' } },
		] as any);

		const result = await handler.handleName(mockEnv, 'old-key');

		expect(result).toBeNull();
		expect(LogOutput.LogValidationError).toHaveBeenCalledWith('bad name');
		expect(psMock.execute).not.toHaveBeenCalled();
	});

	it('handleName should execute rename command and return new name on success', async () => {
		interactiveMock.prompt.mockResolvedValueOnce('new-app');

		const result = await handler.handleName(mockEnv, 'old-key');

		expect(result).toBe('new-app');
		expect(psMock.execute).toHaveBeenCalledWith(
			`Rename-Item "${join('/mock/dir', 'old-key')}" "${join('/mock/dir', 'new-app')}"`,
			'/mock/dir',
		);
	});

	it('handleNvm should prompt for package manager and run install', async () => {
		interactiveMock.singleSelect.mockResolvedValueOnce('npm');

		await handler.handleNvm('/mock/project', mockSpinner);

		expect(interactiveMock.singleSelect).toHaveBeenCalled();
		expect(mockSpinner.start).toHaveBeenCalledWith('Installing dependencies');
		expect(psMock.execute).toHaveBeenCalledWith('npm install', '/mock/project');
		expect(mockSpinner.stop).toHaveBeenCalledWith('Dependencies installed');
	});

	it('handleGit should execute git init command', async () => {
		await handler.handleGit('/mock/project');
		expect(psMock.execute).toHaveBeenCalledWith('git init', '/mock/project');
	});

	it('handle should return early if initial pull DTO validation fails', async () => {
		vi.mocked(validate).mockResolvedValueOnce([
			{ constraints: { error: 'invalid key' } },
		] as any);

		await handler.handle(['invalid'], mockEnv);

		expect(LogOutput.LogValidationError).toHaveBeenCalledWith('invalid key');
		expect(configServiceMock.getConfig).not.toHaveBeenCalled();
	});

	it('handle should display available projects if key is not provided (or falsy after validation)', async () => {
		configServiceMock.getConfig.mockResolvedValueOnce({
			projects: [{ key: 'app1' }, { key: 'app2' }],
		});

		// Provide no key
		await handler.handle([], mockEnv);

		expect(note).toHaveBeenCalled();
		expect(chalk.bold).toHaveBeenCalledWith('Availables');
	});

	it('handle should log error if project key is not found in the config', async () => {
		configServiceMock.getConfig.mockResolvedValueOnce({
			projects: [{ key: 'different-app', url: 'https://git.com' }],
		});

		await handler.handle(['my-app'], mockEnv);

		expect(LogOutput.LogError).toHaveBeenCalledWith('Project my-app not found');
		expect(psMock.execute).not.toHaveBeenCalled();
	});

	it('handle should pull project and perform no extra steps if metadata flags are false', async () => {
		configServiceMock.getConfig.mockResolvedValueOnce({
			projects: [
				{
					key: 'my-app',
					url: 'https://git.com/repo.git',
					metadata: {
						isChangeName: false,
						isInstallDeps: false,
						isInitGit: false,
					},
				},
			],
		});

		const nameSpy = vi.spyOn(handler, 'handleName');
		const nvmSpy = vi.spyOn(handler, 'handleNvm');
		const gitSpy = vi.spyOn(handler, 'handleGit');

		await handler.handle(['my-app'], mockEnv);

		expect(mockSpinner.start).toHaveBeenCalledWith('Pulling project');
		expect(psMock.execute).toHaveBeenCalledWith(
			'git clone https://git.com/repo.git',
			'/mock/dir',
		);
		expect(psMock.execute).toHaveBeenCalledWith(
			`Remove-Item ".git", ".gitignore" -Recurse -Force`,
			join('/mock/dir', 'my-app'),
		);

		expect(nameSpy).not.toHaveBeenCalled();
		expect(nvmSpy).not.toHaveBeenCalled();
		expect(gitSpy).not.toHaveBeenCalled();

		expect(mockSpinner.stop).toHaveBeenCalledWith('Success!');
	});

	it('handle should call metadata hooks sequentially when flags are enabled', async () => {
		configServiceMock.getConfig.mockResolvedValueOnce({
			projects: [
				{
					key: 'my-app',
					url: 'https://git.com/repo.git',
					metadata: {
						isChangeName: true,
						framework: Framework.Node,
						isInstallDeps: true,
						isInitGit: true,
					},
				},
			],
		});

		interactiveMock.prompt.mockResolvedValueOnce('renamed-app');
		interactiveMock.singleSelect.mockResolvedValueOnce('yarn');
		interactiveMock.confirmAction.mockResolvedValueOnce(true);

		await handler.handle(['my-app'], mockEnv);

		const newProjectPath = join('/mock/dir', 'renamed-app');

		expect(interactiveMock.prompt).toHaveBeenCalledWith('Enter the name');
		expect(psMock.execute).toHaveBeenCalledWith(
			`Rename-Item "${join('/mock/dir', 'my-app')}" "${newProjectPath}"`,
			'/mock/dir',
		);

		expect(interactiveMock.singleSelect).toHaveBeenCalled();
		expect(psMock.execute).toHaveBeenCalledWith('yarn install', newProjectPath);
		expect(interactiveMock.confirmAction).toHaveBeenCalledWith(
			'Would you like to install Git?',
			true,
		);
		expect(psMock.execute).toHaveBeenCalledWith('git init', newProjectPath);

		expect(console.log).toHaveBeenCalled();
	});
});
