import { LogOutput } from './log.output';

export function checkIfArgumentsValidAndPrintErrors(errors: string[]) {
	if (errors.length > 0) {
		LogOutput.LogValidationError(errors[0]);
		return false;
	}
	return true;
}
