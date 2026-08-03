import { spinner } from '@clack/prompts';
import { plainToInstance } from 'class-transformer';
import { type ValidationError, validate } from 'class-validator';
import { Website } from 'common';
import { accent, lime, warn } from 'common/constants';
import { LogOutput } from 'common/utils';
import type { ICommandEnvironments, ICommandHandler } from 'core/types';
import { Framework, type IConfig } from 'data/config';
import type { IInteractiveService } from 'infrastructure';
import type { IConfigService } from 'infrastructure/configService/config.service';
import { LoaderPluginArgDto } from '../dto/loader-key-arg.dto';

export class PluginHandler implements ICommandHandler {
	public constructor(
		private readonly configService: IConfigService,
		private readonly interactive: IInteractiveService,
	) {}

	public async handle(args: any[], env: ICommandEnvironments): Promise<void> {
		let [key, url] = args;

		if (!key) {
			key = await this.interactive.prompt('Enter the plugin name');
		}
		if (!url) {
			url = await this.interactive.prompt('Enter the repo url');
		}

		const dto = plainToInstance(LoaderPluginArgDto, {
			key,
			url,
		} as LoaderPluginArgDto);
		const errors = await validate(dto);
		if (errors.length > 0) {
			this.renderValidationErrors(errors);
			return;
		}
		const { key: validKey, url: validUrl } = dto;

		const config = await this.configService.getConfig();
		const dublicate = config.projects.find(
			(f) => f.key.toLocaleLowerCase() === validKey.toLocaleLowerCase(),
		);
		if (dublicate) {
			LogOutput.LogError('Plugin with this key already exist');
			return;
		}

		const isUrlReferencedToGit = this.validateUrlToGit(validUrl);
		if (!isUrlReferencedToGit) {
			LogOutput.LogValidationError('Url is not referenced to git.');
			return;
		}

		const fw = await this.interactive.singleSelect({
			message: 'Select framework',
			options: [
				{
					label: '.NET',
					value: Framework.NET,
				},
				{
					label: 'NodeJs',
					value: Framework.Node,
				},
			],
		});

		const loader = spinner();
		loader.start('Updating config');

		const newConfig: IConfig = {
			projects: [
				...config.projects,
				{
					key: validKey,
					url: validUrl,
					metadata: {
						framework: fw,
					},
				},
			],
		};

		await this.configService.setConfig(newConfig);
		loader.stop('Success!');
		this.renderSuccessfullMessage(validKey);
	}

	public validateUrlToGit(url: string): boolean {
		if (
			!url.startsWith('https://github.com') &&
			!url.startsWith('https://gitlab.com')
		) {
			return false;
		}
		return true;
	}

	public renderSuccessfullMessage(pluginName: string) {
		const headerMessage =
			warn.bold(`\nConfig ${pluginName} was successfully added.`) +
			`\n\nPull the project ${lime(`peak pull ${pluginName}`)}\n\n` +
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
