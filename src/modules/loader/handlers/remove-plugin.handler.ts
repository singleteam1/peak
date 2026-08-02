import { spinner } from '@clack/prompts';
import { plainToInstance } from 'class-transformer';
import { type ValidationError, validate } from 'class-validator';
import { fail, Website } from 'common';
import { accent, lime, warn } from 'common/constants';
import { LogOutput } from 'common/utils';
import type { ICommandEnvironments, ICommandHandler } from 'core/types';
import type { IConfig } from 'data/config';
import type { IConfigService } from 'infrastructure/configService/config.service';
import { LoaderRemovePluginDto } from '../dto/loader-key-arg.dto';

export class RemovePluginHandler implements ICommandHandler {
	public constructor(private readonly configService: IConfigService) {}

	public async handle(args: any[], env: ICommandEnvironments): Promise<void> {
		const [key] = args;
		const loader = spinner();
		loader.start('Removing plugin from config');

		const dto = plainToInstance(LoaderRemovePluginDto, {
			key,
		} as LoaderRemovePluginDto);
		const errors = await validate(dto);
		if (errors.length > 0) {
			loader.stop(fail);
			this.renderValidationErrors(errors);
			return;
		}
		const { key: validKey } = dto;

		const config = await this.configService.getConfig();
		const filteredProject = config.projects?.filter((f) => f.key !== validKey);
		if (filteredProject) {
			const newConfig: IConfig = {
				projects: filteredProject,
			};
			await this.configService.setConfig(newConfig);
		}
		loader.stop('Success!');
		this.renderSuccessfullMessage(validKey);
	}

	public renderSuccessfullMessage(projectName: string) {
		const headerMessage =
			warn.bold(`Plugin ${projectName} was successfully removed!`) +
			`\n\nAdd custom plugins ${lime('peak plugin')} or` +
			`\nReset all config entirely ${lime('peak reset')}` +
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
