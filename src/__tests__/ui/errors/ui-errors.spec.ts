import { LogOutput } from 'common/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Ui Errors case', () => {
	let logSpy: any;

	beforeEach(() => {
		vi.clearAllMocks();
		logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('Check if suffix for error log', () => {
		const errorMessage = 'Some mock file is broken';

		LogOutput.LogError(errorMessage);
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Error'));
	});

	it('Check if suffix for validation error log', () => {
		const errorMessage = 'Some mock file is broken';

		LogOutput.LogValidationError(errorMessage);
		expect(logSpy).toHaveBeenCalledWith(
			expect.stringContaining('Validation error'),
		);
	});

	it('Check if suffix for credential error log', () => {
		const errorMessage = 'Some mock file is broken';

		LogOutput.LogCredentialError(errorMessage);
		expect(logSpy).toHaveBeenCalledWith(
			expect.stringContaining('Credential error'),
		);
	});
});
