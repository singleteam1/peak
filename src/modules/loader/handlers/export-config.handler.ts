import { spinner } from '@clack/prompts';
import { accent, lime, Website, warn } from 'common';
import type { ICommandEnvironments, ICommandHandler } from 'core/types';
import type { IPowershellService } from 'infrastructure';
import type { IConfigService } from 'infrastructure/configService/config.service';

export class ExportHandlerHandler implements ICommandHandler {
	public constructor(
		private readonly configService: IConfigService,
		private readonly ps: IPowershellService,
	) {}

	public async handle(args: any[], env: ICommandEnvironments): Promise<void> {
		const loader = spinner();
		loader.start('Exporting config');
		const config = await this.configService.getConfig();
		const stringify = JSON.stringify(config);
		const date = new Date();
		await this.ps.execute(
			`'${stringify}' | Set-Content -Path "config-${date.getFullYear()}-${date.getMonth()}-${date.getDay()}.json"`,
			env.calledDir,
		);
		loader.stop('Success!');
		this.renderSuccessfullMessage();
	}

	public renderSuccessfullMessage() {
		const headerMessage =
			warn.bold(`\nConfig was successfully exported.`) +
			`\n\nAdd custom plugins ${lime('peak plugin')}\n\n` +
			`Discover ${accent.bold(Website)} to check the documentation\n`;
		console.log(headerMessage);
	}
}
