import { join } from 'node:path';
import { spinner } from '@clack/prompts';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { defineLockfile, LogOutput } from 'common/utils';
import { NestPrismaModelHandler } from 'modules/nest/handlers/nest-prisma-model.handler';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

// --- Mocks ---

// vi.mock('class-validator', () => ({
// 	validate: vi.fn(),
// }));

// vi.mock('class-transformer', () => ({
// 	plainToInstance: vi.fn((cls, obj) => obj),
// }));

vi.mock('common/utils', () => ({
	defineLockfile: vi.fn(),
	LogOutput: {
		LogError: vi.fn(),
		LogWarn: vi.fn(),
		LogValidationError: vi.fn(),
	},
}));

vi.mock('common', () => ({
	accent: { bold: vi.fn((str: string) => `bold-accent-${str}`) },
	fail: 'mock-fail',
	lime: vi.fn((str: string) => `lime-${str}`),
	Website: 'https://mock-website.com',
	warn: { bold: vi.fn((str: string) => `bold-warn-${str}`) },
}));

vi.mock('nanoid', () => ({
	nanoid: vi.fn(() => 'mock-nanoid-123'),
}));

vi.mock('../dtos/nest-prisma-model.dto', () => ({
	NestPrismaModelDto: class {},
}));

describe('NestPrismaModelHandler', () => {
	let handler: NestPrismaModelHandler;

	// Mock Services
	let interactiveMock: any;
	let explorerMock: any;
	let psMock: any;
	let cacheMock: any;
	let unzipperMock: any;
	let psmMock: any;
	let mockEnv: any;
	let mockSpinner: any;

	beforeEach(() => {
		vi.clearAllMocks();

		interactiveMock = {
			prompt: vi.fn(),
			singleSelect: vi.fn(),
		};

		mockSpinner = {
			start: vi.fn(),
			message: vi.fn(),
			stop: vi.fn(),
		};
		(spinner as Mock).mockReturnValue(mockSpinner);

		explorerMock = {
			exists: vi.fn(),
			delete: vi.fn(),
			createFolder: vi.fn(),
			copyFile: vi.fn(),
			rename: vi.fn(),
			moveFile: vi.fn(),
		};

		psMock = {
			execute: vi.fn(),
		};

		cacheMock = {
			cacheDirectory: '/mock/cache/dir',
		};

		unzipperMock = {
			extract: vi.fn(),
		};

		psmMock = {
			modify: vi.fn(),
			read: vi.fn(),
			appendToEnd: vi.fn(),
		};

		mockEnv = { calledDir: '/mock/called/dir' };
		mockSpinner = spinner();

		handler = new NestPrismaModelHandler(
			interactiveMock,
			explorerMock,
			psMock,
			cacheMock,
			unzipperMock,
			psmMock,
		);
	});

	it('should prompt for name if not provided in args', async () => {
		(validate as Mock).mockResolvedValue([
			{ constraints: { error: 'mock validation error' } },
		]);
		interactiveMock.prompt.mockResolvedValue('PromptedName');

		await handler.handle([undefined, 'mock-path'], mockEnv);

		expect(interactiveMock.prompt).toHaveBeenCalledWith('Enter model name');
		expect(plainToInstance).toHaveBeenCalledWith(expect.anything(), {
			name: 'PromptedName',
		});
	});

	it('should render validation errors and stop if validation fails', async () => {
		(validate as Mock).mockResolvedValue([
			{ constraints: { isString: 'Name must be string' } },
		]);
		const renderSpy = vi.spyOn(handler, 'renderValidationErrors');

		await handler.handle(['InvalidName', 'mock-path'], mockEnv);

		expect(renderSpy).toHaveBeenCalled();
		expect(LogOutput.LogValidationError).toHaveBeenCalledWith(
			'Name must be string',
		);
		expect(defineLockfile).not.toHaveBeenCalled();
	});

	it('should stop and log error if lockfile is not found', async () => {
		(validate as Mock).mockResolvedValue([]);
		(defineLockfile as Mock).mockResolvedValue(false);

		await handler.handle(['ValidName', 'mock-path'], mockEnv);

		expect(mockSpinner.stop).toHaveBeenCalledWith('mock-fail');
		expect(LogOutput.LogError).toHaveBeenCalledWith(
			'Lockfile is not found, install node modules first.',
		);
	});

	it('should prompt for target path if not provided, and handle custom path prompt', async () => {
		(validate as Mock).mockResolvedValue([]);
		(defineLockfile as Mock).mockResolvedValue(true);
		explorerMock.exists.mockResolvedValue(true); // Exists to stop early

		interactiveMock.singleSelect.mockResolvedValue('custom');
		interactiveMock.prompt.mockResolvedValue('/custom/nested/path');

		await handler.handle(['ValidName', undefined], mockEnv);

		expect(interactiveMock.singleSelect).toHaveBeenCalled();
		expect(interactiveMock.prompt).toHaveBeenCalledWith('/src/path-to-modules');
		expect(explorerMock.exists).toHaveBeenCalledWith(
			join('/mock/called/dir', '/custom/nested/path', 'ValidName'),
		);
	});

	it('should log error if model already exists in target path', async () => {
		(validate as Mock).mockResolvedValue([]);
		(defineLockfile as Mock).mockResolvedValue(true);
		explorerMock.exists.mockResolvedValue(true); // Model exists

		await handler.handle(['ValidName', 'mock-path'], mockEnv);

		expect(LogOutput.LogError).toHaveBeenCalledWith(
			'Model ValidName already in use.',
		);
	});

	it('should handle full successful execution of handle method', async () => {
		(validate as Mock).mockResolvedValue([]);
		(defineLockfile as Mock).mockResolvedValue(true);
		explorerMock.exists.mockResolvedValue(false);

		vi.spyOn(handler, 'createInitialNestModuleInstruction').mockResolvedValue(
			undefined,
		);
		vi.spyOn(handler, 'createArtifactInstruction').mockResolvedValue([
			'/mock/artifact',
		]);
		vi.spyOn(handler, 'modifyArtifactInstruction').mockResolvedValue(undefined);
		vi.spyOn(handler, 'modifyArtifactValueInstruction').mockResolvedValue(
			undefined,
		);
		vi.spyOn(handler, 'mergeArtifactsInstruction').mockResolvedValue(undefined);
		vi.spyOn(handler, 'renderSuccessfullMessage').mockReturnValue(undefined);

		await handler.handle(['ValidName', 'mock-path'], mockEnv);

		expect(handler.createInitialNestModuleInstruction).toHaveBeenCalled();
		expect(handler.createArtifactInstruction).toHaveBeenCalled();
		expect(handler.modifyArtifactInstruction).toHaveBeenCalled();
		expect(handler.modifyArtifactValueInstruction).toHaveBeenCalled();
		expect(handler.mergeArtifactsInstruction).toHaveBeenCalled();
		expect(handler.renderSuccessfullMessage).toHaveBeenCalledWith('ValidName');
		expect(mockSpinner.stop).toHaveBeenCalledWith('Success!');
		expect(explorerMock.delete).toHaveBeenCalledWith('/mock/artifact'); // Final cleanup
	});

	it('should log warning and exit if artifactGeneratives is empty', async () => {
		(validate as Mock).mockResolvedValue([]);
		(defineLockfile as Mock).mockResolvedValue(true);
		explorerMock.exists.mockResolvedValue(false);

		vi.spyOn(handler, 'createInitialNestModuleInstruction').mockResolvedValue(
			undefined,
		);
		vi.spyOn(handler, 'createArtifactInstruction').mockResolvedValue([]); // Returns empty array

		await handler.handle(['ValidName', 'mock-path'], mockEnv);

		expect(LogOutput.LogWarn).toHaveBeenCalledWith(
			'Something was going to fail',
		);
		expect(mockSpinner.stop).toHaveBeenCalledWith('mock-fail');
	});

	it('should catch error, log it, and stop if createArtifactInstruction throws', async () => {
		(validate as Mock).mockResolvedValue([]);
		(defineLockfile as Mock).mockResolvedValue(true);
		explorerMock.exists.mockResolvedValue(false);

		vi.spyOn(handler, 'createInitialNestModuleInstruction').mockResolvedValue(
			undefined,
		);
		vi.spyOn(handler, 'createArtifactInstruction').mockRejectedValue(
			new Error('Artifact Error'),
		);

		await handler.handle(['ValidName', 'mock-path'], mockEnv);

		expect(LogOutput.LogError).toHaveBeenCalledWith('Artifact Error');
		expect(mockSpinner.stop).toHaveBeenCalledWith('mock-fail');
	});

	it('should catch error, delete artifact, and stop if modifyArtifactInstruction throws', async () => {
		(validate as Mock).mockResolvedValue([]);
		(defineLockfile as Mock).mockResolvedValue(true);
		explorerMock.exists.mockResolvedValue(false);

		vi.spyOn(handler, 'createInitialNestModuleInstruction').mockResolvedValue(
			undefined,
		);
		vi.spyOn(handler, 'createArtifactInstruction').mockResolvedValue([
			'/mock/artifact',
		]);
		vi.spyOn(handler, 'modifyArtifactInstruction').mockRejectedValue(
			new Error('Modify Error'),
		);

		await handler.handle(['ValidName', 'mock-path'], mockEnv);

		expect(LogOutput.LogError).toHaveBeenCalledWith('Modify Error');
		expect(explorerMock.delete).toHaveBeenCalledWith('/mock/artifact');
	});

	it('should catch error, delete artifact, and stop if modifyArtifactValueInstruction throws', async () => {
		(validate as Mock).mockResolvedValue([]);
		(defineLockfile as Mock).mockResolvedValue(true);
		explorerMock.exists.mockResolvedValue(false);

		vi.spyOn(handler, 'createInitialNestModuleInstruction').mockResolvedValue(
			undefined,
		);
		vi.spyOn(handler, 'createArtifactInstruction').mockResolvedValue([
			'/mock/artifact',
		]);
		vi.spyOn(handler, 'modifyArtifactInstruction').mockResolvedValue(undefined);
		vi.spyOn(handler, 'modifyArtifactValueInstruction').mockRejectedValue(
			new Error('Value Modify Error'),
		);

		await handler.handle(['ValidName', 'mock-path'], mockEnv);

		expect(LogOutput.LogError).toHaveBeenCalledWith('Value Modify Error');
		expect(explorerMock.delete).toHaveBeenCalledWith('/mock/artifact');
	});

	it('should catch error, delete artifact, and stop if mergeArtifactsInstruction throws', async () => {
		(validate as Mock).mockResolvedValue([]);
		(defineLockfile as Mock).mockResolvedValue(true);
		explorerMock.exists.mockResolvedValue(false);

		vi.spyOn(handler, 'createInitialNestModuleInstruction').mockResolvedValue(
			undefined,
		);
		vi.spyOn(handler, 'createArtifactInstruction').mockResolvedValue([
			'/mock/artifact',
		]);
		vi.spyOn(handler, 'modifyArtifactInstruction').mockResolvedValue(undefined);
		vi.spyOn(handler, 'modifyArtifactValueInstruction').mockResolvedValue(
			undefined,
		);
		vi.spyOn(handler, 'mergeArtifactsInstruction').mockRejectedValue(
			new Error('Merge Error'),
		);

		await handler.handle(['ValidName', 'mock-path'], mockEnv);

		expect(LogOutput.LogError).toHaveBeenCalledWith('Merge Error');
		expect(explorerMock.delete).toHaveBeenCalledWith('/mock/artifact');
	});

	it('should run createInitialNestModuleInstruction successfully', async () => {
		const dto = { name: 'TestModel' } as any;
		await handler.createInitialNestModuleInstruction(
			mockSpinner,
			'/modules',
			dto,
		);

		expect(psMock.execute).toHaveBeenCalledWith(
			'nest g res TestModel --no-spec',
			'/modules',
		);
		expect(explorerMock.delete).toHaveBeenCalledWith(
			join('/modules', 'TestModel'),
		);
	});

	it('should log error and stop if createInitialNestModuleInstruction fails to execute', async () => {
		psMock.execute.mockRejectedValue(new Error('Nest CLI Error'));
		const dto = { name: 'TestModel' } as any;

		await handler.createInitialNestModuleInstruction(
			mockSpinner,
			'/modules',
			dto,
		);

		expect(LogOutput.LogError).toHaveBeenCalledWith('Cannot create a module');
		expect(mockSpinner.stop).toHaveBeenCalledWith('mock-fail');
	});

	it('should run createArtifactInstruction and return extracted path', async () => {
		explorerMock.exists.mockResolvedValue(false); // Folder doesn't exist initially

		const result = await handler.createArtifactInstruction(
			mockEnv,
			mockSpinner,
		);

		const expectedPath = join('/mock/called/dir', 'mock-nanoid-123');
		const expectedArchivePath = join(expectedPath, 'model.rar');

		expect(explorerMock.createFolder).toHaveBeenCalledWith(expectedPath);
		expect(explorerMock.copyFile).toHaveBeenCalledWith(
			join('/mock/cache/dir', 'nest-prisma-model.rar'),
			expectedArchivePath,
		);
		expect(unzipperMock.extract).toHaveBeenCalledWith(
			expectedArchivePath,
			expectedPath,
		);
		expect(explorerMock.delete).toHaveBeenCalledWith(expectedArchivePath);
		expect(result).toEqual([expectedPath]);
	});

	it('should throw error if unzipper fails in createArtifactInstruction', async () => {
		explorerMock.exists.mockResolvedValue(true); // Folder exists
		unzipperMock.extract.mockRejectedValue(new Error('Unzip failed'));

		await expect(
			handler.createArtifactInstruction(mockEnv, mockSpinner),
		).rejects.toThrow('Failed to extract the artifact');
	});

	it('should run modifyArtifactInstruction and rename all required files', async () => {
		const dto = { name: 'TestModel' } as any;
		await handler.modifyArtifactInstruction('/mock/artifact', mockSpinner, dto);

		expect(explorerMock.rename).toHaveBeenCalledTimes(8);
		expect(explorerMock.rename).toHaveBeenCalledWith(
			join('/mock/artifact', 'dbobj.controller.ts'),
			join('/mock/artifact', 'TestModel.controller.ts'),
		);
		expect(explorerMock.rename).toHaveBeenCalledWith(
			join('/mock/artifact', 'dto', 'find-by-title-dbobj.query.ts'),
			join('/mock/artifact', 'dto', 'find-by-title-TestModel.query.ts'),
		);
	});

	it('should throw error if explorer.rename fails in modifyArtifactInstruction', async () => {
		const dto = { name: 'TestModel' } as any;
		explorerMock.rename.mockRejectedValue(new Error('Rename failed'));
		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		await expect(
			handler.modifyArtifactInstruction('/mock/artifact', mockSpinner, dto),
		).rejects.toThrow('Unable to modify artifact');
		expect(consoleSpy).toHaveBeenCalled();
	});

	it('should run modifyArtifactValueInstruction, modify files, and handle prisma schema append if exists', async () => {
		const dto = { name: 'TestModel' } as any;
		psmMock.modify.mockResolvedValue(true);
		explorerMock.exists.mockResolvedValue(true); // prisma.schema exists
		psmMock.read.mockResolvedValue('model TestModel {}');

		await handler.modifyArtifactValueInstruction(
			'/mock/artifact',
			dto,
			'/caller',
		);

		expect(psmMock.modify).toHaveBeenCalledTimes(9); // 9 paths modified
		expect(psmMock.modify).toHaveBeenCalledWith(
			join('/mock/artifact', 'TestModel.service.ts'),
			'Dbobj',
			'TestModel',
		);
		expect(psmMock.appendToEnd).toHaveBeenCalledWith(
			join('/caller', 'prisma', 'schema.prisma'),
			'\n\nmodel TestModel {}',
		);
		expect(explorerMock.delete).toHaveBeenCalledWith(
			join('/mock/artifact', 'prisma.schema'),
		);
	});

	it('should throw error if any psm.modify step fails in modifyArtifactValueInstruction', async () => {
		const dto = { name: 'TestModel' } as any;
		psmMock.modify
			.mockResolvedValueOnce(true)
			.mockResolvedValueOnce(false)
			.mockResolvedValue(true);
		explorerMock.exists.mockResolvedValue(false);

		await expect(
			handler.modifyArtifactValueInstruction('/mock/artifact', dto, '/caller'),
		).rejects.toThrow('Unable to modify artifact values');
	});

	it('should run mergeArtifactsInstruction and move files successfully', async () => {
		const dto = { name: 'TestModel' } as any;
		await handler.mergeArtifactsInstruction(
			'/mock/artifact',
			mockSpinner,
			dto,
			'/target/modules',
		);

		expect(explorerMock.moveFile).toHaveBeenCalledWith(
			'/mock/artifact',
			join('/target/modules', 'TestModel'),
		);
	});

	it('should throw error if merge fails in mergeArtifactsInstruction', async () => {
		const dto = { name: 'TestModel' } as any;
		explorerMock.moveFile.mockRejectedValue(new Error('Move failed'));

		await expect(
			handler.mergeArtifactsInstruction(
				'/mock/artifact',
				mockSpinner,
				dto,
				'/target/modules',
			),
		).rejects.toThrow('Unable to merge changes');
	});

	it('should render successfull message correctly via console.log', () => {
		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		handler.renderSuccessfullMessage('TestModel');

		expect(consoleSpy).toHaveBeenCalled();
		const loggedString = consoleSpy.mock.calls[0][0] as string;
		expect(loggedString).toContain(
			'bold-warn-\nA new model TestModel added to project!',
		);
		expect(loggedString).toContain(
			'lime-npx prisma migrate dev --name "Add TestModel table"',
		);
		expect(loggedString).toContain('lime-npx prisma generate');
		expect(loggedString).toContain('bold-accent-https://mock-website.com');
	});

	it('should ignore validation errors without constraints in renderValidationErrors', () => {
		const errors: any[] = [{ property: 'name' }]; // No constraints property
		handler.renderValidationErrors(errors);

		expect(LogOutput.LogValidationError).not.toHaveBeenCalled();
	});
});
