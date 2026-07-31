#!/usr/bin/env node
import { LogOutput } from 'common/utils';
import { extractErrorMessage } from 'common/utils/error-check';
import { CommandAdapter } from 'core/command.adapter';
import type { ICommandEnvironments } from 'core/types/command.types';
import { all_definitions } from 'modules'

async function bootstrap() {
	const environment: ICommandEnvironments = {
		calledDir: process.cwd(),
		dist: process.argv[1],
	};

	const core = new CommandAdapter(environment)
		.addName('PEAK')
		.addDescription(
			'Elevate your development workflow with a suite of powerful tools designed for generating robust, production-ready web blanks',
		)
		.addVersion('1.0.0');

	core.registerDefinitions(all_definitions);
	await core.parseArguments();
}

bootstrap()
	.then((data) => data)
	.catch((error) => {
		const extractedErrorMessage = extractErrorMessage(
			error,
			'Unavailable to use peak',
		);
		LogOutput.LogError(extractedErrorMessage);
	});
