export abstract class BaseException extends Error {
	constructor(message: string) {
		super(message);

		Object.setPrototypeOf(this, new.target.prototype);

		this.name = this.constructor.name;

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}
}
