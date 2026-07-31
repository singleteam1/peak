import chalk from 'chalk';
import { outputColors } from 'common/constants';

export class LogOutput {
	public static LogInfo(message: string) {
		console.error(
			LogOutput.ErrorTemplate(message, 'Info', outputColors.command),
		);
	}
	public static LogWarn(errorMessage: string) {
		console.error(
			LogOutput.ErrorTemplate(errorMessage, 'Warn', outputColors.warn),
		);
	}

	public static LogError(errorMessage: string) {
		console.error(
			LogOutput.ErrorTemplate(errorMessage, 'Error', outputColors.danger),
		);
	}

	public static LogValidationError(errorMessage: string) {
		console.error(
			LogOutput.ErrorTemplate(
				errorMessage,
				'Validation error',
				outputColors.danger,
			),
		);
	}

	public static LogCredentialError(errorMessage: string) {
		console.error(
			LogOutput.ErrorTemplate(
				errorMessage,
				'Credential error',
				outputColors.danger,
			),
		);
	}

	private static ErrorTemplate(message: string, prefix: string, color: string) {
		return `${chalk.hex(color)(`${prefix}: `)} ${message}`;
	}
}
