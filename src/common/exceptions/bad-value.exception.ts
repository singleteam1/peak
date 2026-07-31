import { BaseException } from './base-exception';

export class BadValueException extends BaseException {
	private readonly value: string | null;
	constructor(message: string, value?: string) {
		super(message);
		this.value = value ?? null;
		Object.setPrototypeOf(this, new.target.prototype);

		this.name = this.constructor.name;

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}
}
