import type { ICommand } from 'core/types';
import { type IInteractiveService, Interactive, type IPowershellService, PowershellService } from "infrastructure";
import {
  applicationCacheName,
  DiskCache,
  type ICache,
} from "infrastructure/cache";
import { ConfigService, type IConfigService } from 'infrastructure/configService/config.service'

export const pull_handlers: ICommand[] = [
  {
    command: "pull",
    description: "Pull the application",
    arguments: [
      {
        argument: '[name]',
        description: 'Project name to pull.'
      }
    ],
    load: async () => {
      const module = await import("./handlers/pull.handler");
       const cacheManager: ICache = new DiskCache(applicationCacheName);
      const configService: IConfigService = new ConfigService(cacheManager);
      const interactive: IInteractiveService = new Interactive();
      const ps: IPowershellService = new PowershellService();
      return new module.PullHandler(configService, interactive, ps);
    },
  },
] as const;
