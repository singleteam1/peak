import type { ICommand } from 'core/types';
import {
	ExplorerService,
	type IExplorerService,
	type IInteractiveService,
	Interactive,
	type IPowershellService,
	PowershellService,
} from 'infrastructure';
import {
	applicationCacheName,
	DiskCache,
	type ICache,
} from 'infrastructure/cache';
import {
	ConfigService,
	type IConfigService,
} from 'infrastructure/configService/config.service';

export const loader_handlers: ICommand[] = [
	{
		command: 'reset',
		description: 'Reset entire config.',
		load: async () => {
			const module = await import('./handlers/reset.handler');
			const cacheManager: ICache = new DiskCache(applicationCacheName);
			const interactive: IInteractiveService = new Interactive();
			return new module.ResetHandler(cacheManager, interactive);
		},
	},
	{
		command: 'add-plugin',
		description: 'Custom plugin to connect to the CLI',
		arguments: [
			{
				argument: '[key]',
				description: 'Key name of the command',
			},
			{
				argument: '[url]',
				description: 'Exact url for getting pulled the project',
			},
		],
		load: async () => {
			const module = await import('./handlers/plugin.handler');
			const cacheManager: ICache = new DiskCache(applicationCacheName);
			const interactive: IInteractiveService = new Interactive();
			const configService: IConfigService = new ConfigService(cacheManager);
			return new module.PluginHandler(configService, interactive);
		},
	},
	{
		command: 'remove-plugin',
		description: 'Remove custom plugin',
		arguments: [
			{
				argument: '[key]',
				description: 'Key name of the command',
			},
		],
		load: async () => {
			const module = await import('./handlers/remove-plugin.handler');
			const cacheManager: ICache = new DiskCache(applicationCacheName);
			const configService: IConfigService = new ConfigService(cacheManager);
			return new module.RemovePluginHandler(configService);
		},
	},
	{
		command: 'export-config',
		description: 'Export config',
		load: async () => {
			const module = await import('./handlers/export-config.handler');
			const cacheManager: ICache = new DiskCache(applicationCacheName);
			const configService: IConfigService = new ConfigService(cacheManager);
			const ps: IPowershellService = new PowershellService();
			return new module.ExportHandlerHandler(configService, ps);
		},
	},
] as const;
