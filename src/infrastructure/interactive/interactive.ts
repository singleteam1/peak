import { select, text } from '@clack/prompts';
import inquirer from 'inquirer';
import type { TSingleSelectProps } from './interactive.types';

export interface IInteractiveService {
	confirmAction: (message: string, initValue: boolean) => Promise<boolean>;
	singleSelect: <TVal>(props: TSingleSelectProps<TVal>) => Promise<TVal | any>;
	prompt(message: string, defaultMessage?: string): Promise<string>;
}

export class Interactive implements IInteractiveService {
	public async confirmAction(
		message: string,
		initValue: boolean,
	): Promise<boolean> {
		const isInstall = await inquirer.prompt({
			type: 'confirm',
			name: 'isSuccess',
			message: message,
			default: initValue,
		} as any);
		return isInstall.isSuccess;
	}

	public async singleSelect<TVal>({
		message,
		options,
		initValue,
	}: TSingleSelectProps<TVal>): Promise<TVal | any> {
		return await select({
			message: message,
			initialValue: initValue,
			options: options.map((f) => ({
				label: f.label,
				value: f.value as any,
			})),
		});
	}

	public async prompt(
		message: string,
		defaultMessage?: string,
	): Promise<string> {
		return (await text({
			message,
			defaultValue: defaultMessage,
		})) as string;
	}
}
