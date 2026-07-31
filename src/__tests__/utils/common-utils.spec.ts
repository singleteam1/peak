import { extractErrorMessage, isNullOrWhiteSpace } from 'common/utils/index.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Common Utils', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it.each([
		'default string',
		'--mock-options',
	])('Check if null or whitespace returns be false for %s', (field) => {
		const checkedField = isNullOrWhiteSpace(field);
		expect(checkedField).false;
	});

	it.each([
		null,
		undefined,
		'',
		' ',
	])('Check if null or whitespace returns be true for "%s"', (field) => {
		const checkedField = isNullOrWhiteSpace(field);
		expect(checkedField).true;
	});

	it.each([
		'some error',
		new Error('some error'),
		{ mock: 'something bad' },
	])('Check if error extraction gets the message %s', (errorMessage) => {
		const extractedErrorMessage = extractErrorMessage(
			errorMessage,
			'custom error',
		);

		if (extractedErrorMessage !== 'some error') {
			expect(extractedErrorMessage).toEqual('custom error');
		} else {
			expect(extractedErrorMessage).toEqual('some error');
		}
	});
});
