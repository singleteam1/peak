import type { ICommand } from 'core/types';
import {
	applicationCacheName,
	DiskCache,
	ExplorerService,
	type ICache,
	type IExplorerService,
	type IInteractiveService,
	Interactive,
	type IPowershellModifierService,
	type IPowershellService,
	type IUnzipper,
	PowershellModifierService,
	PowershellService,
	Unzipper,
} from 'infrastructure';

export const nest_handlers: ICommand[] = [
	{
		command: 'nest-prisma-model',
		description: 'Create a new prisma object',
		arguments: [
			{
				argument: '[name]',
				description: 'Model name',
			},
			{
				argument: '[path]',
				description: 'Specific path to module',
			},
		],
		load: async () => {
			const module = await import('./handlers/nest-prisma-model.handler');
			const cacheManager: ICache = new DiskCache(applicationCacheName);
			// const configService: IConfigService = new ConfigService(cacheManager);
			const interactive: IInteractiveService = new Interactive();
			const explorer: IExplorerService = new ExplorerService();
			const ps: IPowershellService = new PowershellService();
			const psm: IPowershellModifierService = new PowershellModifierService(ps);
			const unzipper: IUnzipper = new Unzipper();
			return new module.NestPrismaModelHandler(
				interactive,
				explorer,
				ps,
				cacheManager,
				unzipper,
				psm,
			);
		},
	},
] as const;
