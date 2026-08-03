import { spinner } from '@clack/prompts';
import { plainToInstance } from 'class-transformer';
import { type ValidationError, validate } from 'class-validator';
import { accent, lime, Website, warn } from 'common';
import { LogOutput } from 'common/utils';
import { getFileContent } from 'common/utils/read-file';
import type { ICommandEnvironments, ICommandHandler } from 'core/types';
import type { IConfig } from 'data/config';
import type { IExplorerService, IInteractiveService } from 'infrastructure';
import type { IConfigService } from 'infrastructure/configService/config.service';
import { join } from 'path';
import { LoaderConfigNameDto } from '../dto/loader-key-arg.dto';

export class ImportHandlerHandler implements ICommandHandler {
	public constructor(
		private readonly configService: IConfigService,
		private readonly interactive: IInteractiveService,
		private readonly explorer: IExplorerService,
	) {}

	public async handle(args: any[], env: ICommandEnvironments): Promise<void> {
		const isConfirmed = await this.interactive.confirmAction(
			'Are you sure you want to import a new config?',
			true,
		);
		if (!isConfirmed) {
			LogOutput.LogError('Cancelled.');
			return;
		}

		let [name] = args;
		if (!name) {
			name = await this.interactive.prompt('Enter config name:');
		}

		const dto = plainToInstance(LoaderConfigNameDto, { name });
		const errors = await validate(dto);

		if (errors.length > 0) {
			this.renderValidationErrors(errors);
			return;
		}

		const pathToConfig = join(env.calledDir, dto.name);
		const fileExists = await this.explorer.exists(pathToConfig);

		if (!fileExists) {
			LogOutput.LogError(`Config does not exist by this name: ${dto.name}`);
			return;
		}

		const loader = spinner();
		loader.start('Importing config...');

		const loadConfig = await getFileContent(pathToConfig);
		if (!loadConfig.success) {
			loader.stop('Failed');
			LogOutput.LogError('Cannot read the config file.');
			return;
		}

		try {
			const parsedConfig = JSON.parse(loadConfig.output) as IConfig;
			const isSaved = await this.configService.setConfig(parsedConfig);

			if (!isSaved) {
				loader.stop('Failed');
				LogOutput.LogError('Cannot save the new config.');
				return;
			}

			loader.stop('Success!');
			this.renderSuccessfullMessage();
		} catch (error) {
			loader.stop('Failed');
			LogOutput.LogError(
				'Failed to parse config file. Ensure it is valid JSON.',
			);
		}
	}

	public renderSuccessfullMessage() {
		const headerMessage =
			warn.bold(`\nConfig was successfully imported.`) +
			`\n\nAdd custom plugins ${lime('peak plugin')}\n\n` +
			`Discover ${accent.bold(Website)} to check the documentation\n`;
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
