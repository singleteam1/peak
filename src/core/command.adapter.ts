import { Command } from 'commander';
import { LogOutput } from 'common/utils';
import type {
	ICommand,
	ICommandArgument,
	ICommandEnvironments,
	ICommandOption,
} from './types';

export class CommandAdapter {
	private commander: Command;
	private environment: ICommandEnvironments;

	constructor(environment: ICommandEnvironments) {
		this.commander = new Command();
		this.environment = environment;
		this.commander.configureOutput({
			outputError: (str) => {
				LogOutput.LogError(str.replace('error: ', ''));
			},
		});
	}

	public addName(name: string) {
		this.commander.name(name);
		return this;
	}

	public addDescription(description: string) {
		this.commander.description(description);
		return this;
	}

	public addVersion(version: string) {
		this.commander.version(version);
		return this;
	}

	public addOption(option: string) {
		this.commander.option(option);
		return this;
	}

	public async parseArguments() {
		// Entry point for commander
		await this.commander.parseAsync(process.argv);
	}

	public async registerDefinitions(
		definitions: ICommand[] | readonly ICommand[],
	) {
		await Promise.all(
			definitions.map(async (definition) => {
				const stagedCommand = this.commander
					.command(definition.command)
					.option('-d, --hint', 'Show command hints', false)
					.description(definition.description);

				if (definition.arguments) {
					this.registerArguments(stagedCommand, definition.arguments);
				}
				if (definition.options) {
					this.registerOptions(stagedCommand, definition.options);
				}

				this.registerAction(stagedCommand, definition);
			}),
		);
	}

	private registerArguments(command: Command, args: ICommandArgument[]) {
		args.forEach((argument) => {
			const commandArgument = this.commander.createArgument(
				argument.argument,
				argument.description,
			);
			if (argument.choices) {
				commandArgument.choices(argument.choices);
			}
			command.addArgument(commandArgument);
		});
	}

	private registerOptions(command: Command, opts: ICommandOption[]) {
		opts.forEach((option) => {
			command.option(option.flags, option.description, option.defaultValue);
		});
	}

	private registerAction(command: Command, definition: ICommand) {
		command.action(async (...args) => {
			const handler = await definition.load();
			await handler.handle(args, this.environment);
		});
	}
}
