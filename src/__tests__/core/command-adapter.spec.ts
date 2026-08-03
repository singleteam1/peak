/** biome-ignore-all lint/suspicious/noExplicitAny: used inside tests */
/** biome-ignore-all lint/correctness/noUnusedFunctionParameters: used inside tests */
import { setupConsoleLogs } from '__tests__/setup/setup-logs';
import { CommandAdapter } from 'core';
import type {
	ICommand,
	ICommandEnvironments,
	ICommandHandler,
} from 'core/types/command.types.js';
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';

class MockHandler implements ICommandHandler {
	async handle(args: any[], env: ICommandEnvironments): Promise<void> {
		console.log(`Running mock, args: ${args[0]}`);
	}
}
class MockEnvHandler implements ICommandHandler {
	async handle(args: any[], env: ICommandEnvironments): Promise<void> {
		console.log(`Paths: ${env.calledDir}//${env.dist}`);
	}
}

function setProcessArgs(args: string[]) {
	process.argv = ['/usr/bin/node', 'peak-cli', ...args];
}

describe('core/adapter', () => {
	let adapter: CommandAdapter;
	let environment: ICommandEnvironments;
	let logSpy: any;
	const originalArgv = process.argv;
	let mockDefinition: ICommand;

	beforeAll(() => {
		setupConsoleLogs();
	});

	beforeEach(() => {
		vi.clearAllMocks();
		logSpy = vi.spyOn(console, 'log');

		environment = {
			calledDir: 'path/to/caller-dir',
			dist: 'path/to/dist',
		};

		adapter = new CommandAdapter(environment);
		adapter
			.addName('MOCK')
			.addDescription('Mock description')
			.addVersion('1.10.20');

		mockDefinition = {
			command: 'mock',
			arguments: [
				{
					argument: '[kind]',
					description: 'some kind of argument',
				},
			],
			description: 'mock command',
			load: () => Promise.resolve(new MockHandler()),
		};
		(adapter as any).commander.exitOverride();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		process.argv = originalArgv;
	});

	it('Should check version', async () => {
		setProcessArgs(['-V']);

		try {
			await adapter.parseArguments();
		} catch (error: any) {
			expect(error.message).toBe('1.10.20');
		}
	});

	it('Should check executation of the registered definitions with arguments', async () => {
		adapter.registerDefinitions([mockDefinition]);
		setProcessArgs(['mock', 'tea']);
		await adapter.parseArguments();

		expect(logSpy).toHaveBeenCalledWith(
			expect.stringContaining('Running mock'),
		);
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('mock'));
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('tea'));
	});
	it('Should check executation of the registered definitions without arguments', async () => {
		adapter.registerDefinitions([mockDefinition]);
		setProcessArgs(['mock']);
		await adapter.parseArguments();

		expect(logSpy).toHaveBeenCalledWith(
			expect.stringContaining('Running mock'),
		);
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('mock'));
	});

	it('Should check the command passes environment paths', async () => {
		const envDefinition: ICommand = {
			...mockDefinition,
			arguments: undefined,
			load: () => Promise.resolve(new MockEnvHandler()),
		};
		adapter.registerDefinitions([envDefinition]);
		setProcessArgs(['mock']);

		await adapter.parseArguments();

		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Paths:'));
		expect(logSpy).toHaveBeenCalledWith(
			expect.stringContaining(environment.calledDir),
		);
		expect(logSpy).toHaveBeenCalledWith(
			expect.stringContaining(environment.dist),
		);
	});
});
