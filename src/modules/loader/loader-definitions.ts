import type { ICommand } from 'core/types';

export const loader_handlers: ICommand[] = [
	{
		command: 'reset',
		description: 'Reset entire config.',
		load: async () => {
			const module = await import('./handlers/reset.handler');
			return new module.ResetHandler();
		},
	},
	{
		command: 'plugin',
		description: 'Custom plugin to connect to the CLI',
		load: async () => {
			const module = await import('./handlers/plugin.handler');
			return new module.PluginHandler();
		},
	},
] as const;
