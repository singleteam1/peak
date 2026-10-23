import { vi } from 'vitest';

vi.mock('class-transformer', async (importOriginal) => {
	const actual = await importOriginal<typeof import('class-transformer')>();
	return {
		...actual,
		plainToInstance: vi.fn((_cls, obj) => obj),
	};
});

vi.mock('class-validator', async (importOriginal) => {
	const actual = await importOriginal<typeof import('class-validator')>();
	return {
		...actual,
		validate: vi.fn(),
	};
});
