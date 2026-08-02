/** biome-ignore-all lint/correctness/noSwitchDeclarations: <explanation> */
import { note, spinner } from '@clack/prompts';
import chalk from 'chalk';
import { plainToInstance } from 'class-transformer';
import { type ValidationError, validate } from 'class-validator';
import { fail, lockfileList, Website } from 'common';
import { accent, lime, warn } from 'common/constants';
import { isNullOrWhiteSpace, LogOutput } from 'common/utils';
import type { ICommandEnvironments, ICommandHandler } from 'core/types';
import { Framework } from 'data/config';
import type { IPowershellService } from 'infrastructure';
import type { IConfigService } from 'infrastructure/configService/config.service';
import type { IInteractiveService } from 'infrastructure/interactive';
import { join } from 'path';
import { AppNameDto, AppPullKeyDto } from '../dto/app-pull.dto';

export class PullHandler implements ICommandHandler {
	public constructor(
		private readonly configService: IConfigService,
		private readonly interactive: IInteractiveService,
		private readonly ps: IPowershellService,
	) {}

	public async handle(args: any[], env: ICommandEnvironments): Promise<void> {
		const [key] = args;
		const loader = spinner();

		const dto = plainToInstance(AppPullKeyDto, {
			key,
		} as AppPullKeyDto);
		const errors = await validate(dto);
		if (errors.length > 0) {
			this.renderValidationErrors(errors);
			return;
		}
		const { key: validKey } = dto;

		const config = await this.configService.getConfig();
		if (!validKey) {
			note(
				config.projects
					.map((f, i) => `${(i + 1) % 12 === 0 ? '\n' : ''}${f.key}`)
					.join(', '),
				chalk.bold('Availables'),
			);
			return;
		}
		const findProject = config.projects.find(
			(f) => f.key.toLocaleLowerCase() === validKey.toLocaleLowerCase(),
		);
		if (!findProject) {
			LogOutput.LogError(`Project ${validKey} not found`);
			return;
		}

		loader.start('Pulling project');
		await this.ps.execute(`git clone ${findProject.url}`, env.calledDir);
		await this.ps.execute(
			`Remove-Item ".git", ".gitignore" -Recurse -Force`,
			join(env.calledDir, validKey),
		);
    loader.stop('Success!');
		const { metadata } = findProject;
    let projectName = null;
    if (metadata.isChangeName) {
      projectName = await this.handleName(env, validKey); 
    }
    const projectPatch = join(env.calledDir, projectName || validKey);
		if (metadata.framework === Framework.Node && metadata.isInstallDeps) {  
      await this.handleNvm(projectPatch, loader)
		}

    if (metadata.isInitGit) {
      const isInitGit = await this.interactive.confirmAction("Would you like to install Git?", true);
      if (isInitGit) {
        await this.handleGit(projectPatch)
      }
    }
		this.renderSuccessfullMessage(validKey);
	}

	public async validateKeyArg(key: string): Promise<string | null> {
		let validKey = key;
		if (isNullOrWhiteSpace(validKey)) {
			validKey = await this.interactive.prompt('Enter the key');
		}
		return validKey;
	}

  public async handleName(env: ICommandEnvironments, validKey: string) : Promise<string> {
    const newName = await this.interactive.prompt('Enter the name');
    const dto = plainToInstance(AppNameDto, {name: newName} as AppNameDto);
    const errors = await validate(dto);
    if (errors.length > 0) {
      this.renderValidationErrors(errors);
      return null;
    }
    await this.ps.execute(`Rename-Item "${join(env.calledDir, validKey)}" "${join(env.calledDir, newName)}"`, env.calledDir)
    return dto.name;
  }

  public async handleNvm(projectPath: string, loader: any): Promise<void> {
    const nvm = await this.interactive.singleSelect({
			message: 'Which package manager would like to use?',
			options: lockfileList.map((f) => {
				return {
					label: f.packageManager,
					value: f.packageManager,
				};
			}),
		});
    loader.start('Installing dependencies');
    await this.ps.execute(`${nvm} install`, projectPath)
    loader.stop("Dependencies installed");
  }

  public async handleGit(projectPath: string) : Promise<void> {
    await this.ps.execute('git init', projectPath);
  }

	public renderSuccessfullMessage(projectName: string) {
		const headerMessage =
			warn.bold(`\nProject ${projectName} pulled successfully!`) +
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
