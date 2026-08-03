import { vi } from 'vitest';

// vi.mock('@clack/prompts', () => ({
// 	spinner: vi.fn(),
// }));

vi.mock('@clack/prompts', () => ({
	spinner: vi.fn(() => ({
		start: vi.fn(),
		stop: vi.fn(),
	})),
	note: vi.fn(),
}));
