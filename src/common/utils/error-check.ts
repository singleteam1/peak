import type { AxiosError } from 'axios';
import type { ValidationError } from 'class-validator';
import type { ApiResponseError } from 'common';
import { BaseException } from 'common/exceptions';

export function extractErrorMessage(
	error: string | Error | any,
	defaultError?: string,
) {
	if (typeof error === 'string') {
		return error;
	}
	if (error instanceof Error || error instanceof BaseException) {
		return error.message;
	}

	const axiosError = error as AxiosError<ApiResponseError>;
	if (axiosError.response?.data) {
		return axiosError.response.data.message;
	}

	return (
		defaultError ?? 'Service is temporary unavailable, please try again later.'
	);
}

export function extractValidationErrors(errors: ValidationError[]): string[] {
	if (errors.length === 0) {
		return [];
	}

	// Extract value from key-value dictionary
	return errors.map((error) => Object.values(error.constraints || {}).join());
}
