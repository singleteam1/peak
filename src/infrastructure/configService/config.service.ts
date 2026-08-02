import { configKey, type IConfig } from 'data/config'
import type { ICache } from 'infrastructure/cache'

export interface IConfigService {
	getConfig() : Promise<IConfig>;
	setConfig(config: IConfig) : Promise<boolean>;
}

export class ConfigService implements IConfigService {
	public constructor(private readonly cache: ICache) {}

	public async getConfig() : Promise<IConfig> {
		const config = await this.cache.get<string>(configKey);
		const parsedConfig = JSON.parse(config) as IConfig;
		return parsedConfig;
	}

	public async setConfig(config: IConfig) : Promise<boolean> {
		try {
			await this.cache.set(configKey, JSON.stringify(config));
			return true;
		} catch (error) {
			return false;
		}
	}
}