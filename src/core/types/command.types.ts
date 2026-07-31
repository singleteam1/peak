export interface ICommandEnvironments {
	calledDir: string;
	dist: string;
}

export interface ICommandArgument {
	argument: string;
	description: string;
	choices?: string[];
}

export type ICommandOption = {
	flags: string;
	description?: string;
	defaultValue?: string | boolean | string[];
};

export interface ICommand {
	command: string;
	description?: string;
	arguments?: ICommandArgument[];
	options?: ICommandOption[];
	load: () => Promise<ICommandHandler>;
}

export interface IAuthorizedCommand extends ICommand {
	isAuthorized?: boolean;
}

export interface ICommandHandler {
	handle(args: any[], env: ICommandEnvironments): Promise<void>;
}
