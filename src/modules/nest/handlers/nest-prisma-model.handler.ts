import { join } from 'node:path';
import { spinner } from '@clack/prompts';
import { plainToInstance } from 'class-transformer';
import { type ValidationError, validate } from 'class-validator';
import { accent, fail, lime, Website, warn } from 'common';
import { defineLockfile, LogOutput } from 'common/utils';
import type { ICommandEnvironments, ICommandHandler } from 'core/types';
import type {
	ICache,
	IExplorerService,
	IInteractiveService,
	IPowershellModifierService,
	IPowershellService,
	IUnzipper,
} from 'infrastructure';
import { nanoid } from 'nanoid';
import { NestPrismaModelDto } from '../dtos/nest-prisma-model.dto';

export class NestPrismaModelHandler implements ICommandHandler {
	private readonly defaultPlace = 'src/modules';

	public constructor(
		private readonly interactive: IInteractiveService,
		private readonly explorer: IExplorerService,
		private readonly ps: IPowershellService,
		private readonly cache: ICache,
		private readonly unzipper: IUnzipper,
		private readonly psm: IPowershellModifierService,
	) {}

	public async handle(args: any[], env: ICommandEnvironments): Promise<void> {
		let [name, path] = args;

		if (!name) {
			name = await this.interactive.prompt('Enter model name');
		}

		const dto = plainToInstance(NestPrismaModelDto, {
			name,
		} as NestPrismaModelDto);
		const errors = await validate(dto);
		if (errors.length > 0) {
			this.renderValidationErrors(errors);
			return;
		}

		const loader = spinner();
		loader.start('Checking node modules');
		const result = await defineLockfile(env.calledDir);
		if (!result) {
			loader.stop(fail);
			LogOutput.LogError('Lockfile is not found, install node modules first.');
			return;
		}

		loader.stop('Getting modules path');
		let selectedTargetPath = path;
		if (!selectedTargetPath) {
			selectedTargetPath = await this.interactive.singleSelect({
				message: 'Which path should chose to use?',
				options: [
					{
						label: this.defaultPlace,
						value: this.defaultPlace,
					},
					{
						label: 'Custom Path',
						value: 'custom',
					},
				],
			});
		}
		if (selectedTargetPath === 'custom') {
			selectedTargetPath = await this.interactive.prompt(
				'/src/path-to-modules',
			);
		}
		const fullPathToModules = join(env.calledDir, selectedTargetPath);
		loader.start('Checking dublication');

		// Checking existance of selected modules folder path to target model
		const isModelExistInTargetPath = await this.explorer.exists(
			join(fullPathToModules, dto.name),
		);
		if (isModelExistInTargetPath) {
			loader.stop(fail);
			LogOutput.LogError(`Model ${dto.name} already in use.`);
			return;
		}

		// Creating module
		await this.createInitialNestModuleInstruction(
			loader,
			fullPathToModules,
			dto,
		);

		loader.message('Creating artifact');
		// Creating artifact
		let artifactGeneratives = [];
		try {
			const resultOfArtifactCreation = await this.createArtifactInstruction(
				env,
				loader,
			);
			artifactGeneratives = resultOfArtifactCreation;
		} catch (error: any) {
			loader.stop(fail);
			LogOutput.LogError(error.message ?? 'Unable to create artifact');
			return;
		}

		if (artifactGeneratives.length === 0) {
			loader.stop(fail);
			LogOutput.LogWarn('Something was going to fail');
			return;
		}

		loader.message('Modifying artifact');
		// Update all the names to dedicated one
		try {
			await this.modifyArtifactInstruction(artifactGeneratives[0], loader, dto);
		} catch (error: any) {
			loader.stop(fail);
			LogOutput.LogError(error.message ?? 'Unable to modify artifact');
			await this.explorer.delete(artifactGeneratives[0]);
			return;
		}

		loader.message('Modifying artifact values');
		// Update all the value names to dedicated one
		try {
			await this.modifyArtifactValueInstruction(
				artifactGeneratives[0],
				dto,
				env.calledDir,
			);
		} catch (error: any) {
			loader.stop(fail);
			LogOutput.LogError(error.message ?? 'Unable to modify artifact');
			await this.explorer.delete(artifactGeneratives[0]);
			return;
		}

		loader.message('Applying artifact');
		// Copy refined artifact to production code
		try {
			await this.mergeArtifactsInstruction(
				artifactGeneratives[0],
				loader,
				dto,
				fullPathToModules,
			);
		} catch (error: any) {
			loader.stop(fail);
			LogOutput.LogError(error.message ?? 'Unable to modify artifact');
			await this.explorer.delete(artifactGeneratives[0]);
			return;
		} finally {
			await this.explorer.delete(artifactGeneratives[0]);
		}

		loader.stop('Success!');
		this.renderSuccessfullMessage(dto.name);
		return;
	}

	public async createInitialNestModuleInstruction(
		loader: any,
		fullPathToModules: string,
		dto: NestPrismaModelDto,
	) {
		// If no, making a new module using nest cli
		loader.message(`Making a ${dto.name} module`);
		try {
			await this.ps.execute(
				`nest g res ${dto.name} --no-spec`,
				fullPathToModules,
			);
		} catch (error) {
			loader.stop(fail);
			LogOutput.LogError('Cannot create a module');
			return;
		}

		// Then remove blank
		const fullPathToModule = join(fullPathToModules, dto.name);
		await this.explorer.delete(fullPathToModule);
	}

	public async createArtifactInstruction(
		env: ICommandEnvironments,
		loader: any,
	) {
		// Create artifact folder
		const artifactFolderName = nanoid();
		const artifactFolderPath = join(env.calledDir, artifactFolderName);
		if (!(await this.explorer.exists(artifactFolderPath))) {
			await this.explorer.createFolder(artifactFolderPath);
		}

		// Copy .rar from cache to artifact folder
		const endArchiveName = 'model.rar';
		await this.explorer.copyFile(
			join(this.cache.cacheDirectory, 'nest-prisma-model.rar'),
			join(artifactFolderPath, endArchiveName),
		);
		try {
			loader.message('Extracting artifact');
			// unzip it
			await this.unzipper.extract(
				join(artifactFolderPath, endArchiveName),
				artifactFolderPath,
			);
		} catch (error) {
			throw new Error('Failed to extract the artifact');
		}

		// Removing cache .rar
		await this.explorer.delete(join(artifactFolderPath, endArchiveName));
		return [artifactFolderPath];
	}

	public async modifyArtifactInstruction(
		pathToArtifactFolder: string,
		loader: any,
		dto: NestPrismaModelDto,
	) {
		try {
			const endArtifactKey = 'dbobj';
			const entryFolder = join(pathToArtifactFolder);
			const { name: modelName } = dto;
			const pathPairs: { from: string; to: string }[] = [
				{
					from: join(entryFolder, `${endArtifactKey}.controller.ts`),
					to: join(entryFolder, `${modelName}.controller.ts`),
				},
				{
					from: join(entryFolder, `${endArtifactKey}.module.ts`),
					to: join(entryFolder, `${modelName}.module.ts`),
				},
				{
					from: join(entryFolder, `${endArtifactKey}.repository.ts`),
					to: join(entryFolder, `${modelName}.repository.ts`),
				},
				{
					from: join(entryFolder, `${endArtifactKey}.service.ts`),
					to: join(entryFolder, `${modelName}.service.ts`),
				},
				{
					from: join(entryFolder, 'dto', `create-${endArtifactKey}.dto.ts`),
					to: join(entryFolder, 'dto', `create-${modelName}.dto.ts`),
				},
				{
					from: join(
						entryFolder,
						'dto',
						`find-by-id-${endArtifactKey}.query.ts`,
					),
					to: join(entryFolder, 'dto', `find-by-id-${modelName}.query.ts`),
				},
				{
					from: join(
						entryFolder,
						'dto',
						`find-by-title-${endArtifactKey}.query.ts`,
					),
					to: join(entryFolder, 'dto', `find-by-title-${modelName}.query.ts`),
				},
				{
					from: join(entryFolder, 'dto', `update-${endArtifactKey}.dto.ts`),
					to: join(entryFolder, 'dto', `update-${modelName}.dto.ts`),
				},
			];

			loader.message('Applying artifacts changes');
			for (const pair of pathPairs) {
				await this.explorer.rename(pair.from, pair.to);
			}
		} catch (error) {
			console.log(error);
			throw new Error('Unable to modify artifact');
		}
	}

	public async modifyArtifactValueInstruction(
		pathToArtifactFolder: string,
		dto: NestPrismaModelDto,
		callerDir: string,
	) {
		const { name: modelName } = dto;
		const paths = [
			join(pathToArtifactFolder, `${modelName}.controller.ts`),
			join(pathToArtifactFolder, `${modelName}.module.ts`),
			join(pathToArtifactFolder, `${modelName}.repository.ts`),
			join(pathToArtifactFolder, `${modelName}.service.ts`),
			join(pathToArtifactFolder, 'dto', `create-${modelName}.dto.ts`),
			join(pathToArtifactFolder, 'dto', `update-${modelName}.dto.ts`),
			join(pathToArtifactFolder, 'dto', `find-by-id-${modelName}.query.ts`),
			join(pathToArtifactFolder, 'dto', `find-by-title-${modelName}.query.ts`),
			join(pathToArtifactFolder, 'prisma.schema'),
		];
		let taskCompletion = true;
		const endArtifactKey = 'Dbobj';
		for (const path of paths) {
			const isStepSuccess = await this.psm.modify(
				path,
				endArtifactKey,
				modelName,
			);
			if (!isStepSuccess) {
				taskCompletion = false;
			}
		}

		const prismaPath = join(pathToArtifactFolder, 'prisma.schema');
		const isPrismaExist = await this.explorer.exists(prismaPath);
		if (isPrismaExist) {
			const prismaBuffer = await this.psm.read(prismaPath);
			if (prismaBuffer) {
				await this.psm.appendToEnd(
					join(callerDir, 'prisma', 'schema.prisma'),
					'\n\n' + prismaBuffer,
				);
				await this.explorer.delete(join(pathToArtifactFolder, 'prisma.schema'));
			}
		}

		if (!taskCompletion) {
			throw new Error('Unable to modify artifact values');
		}
	}

	public async mergeArtifactsInstruction(
		pathToArtifactFolder: string,
		loader: any,
		dto: NestPrismaModelDto,
		fullPathToModules: string,
	) {
		loader.message('Merge artifact');
		const { name: modelName } = dto;
		try {
			await this.explorer.moveFile(
				pathToArtifactFolder,
				join(fullPathToModules, modelName),
			);
		} catch (error) {
			throw new Error('Unable to merge changes');
		}
	}

	public renderSuccessfullMessage(modelName: string) {
		const headerMessage =
			warn.bold(`\nA new model ${modelName} added to project!`) +
			`\n\nApply prisma changes: ${lime(`npx prisma migrate dev --name "Add ${modelName} table"`)}\n` +
			`Generate dto files: ${lime(`npx prisma generate`)}` +
			`\n\nDiscover ${accent.bold(Website)} to check the documentation\n`;
		console.log(headerMessage);
	}

	public renderValidationErrors(errors: ValidationError[]): void {
		for (const error of errors) {
			if (error.constraints) {
				const messages = Object.values(error.constraints).join(', ');
				LogOutput.LogValidationError(messages);
			}
		}
	}
}
