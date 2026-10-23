import { vi } from 'vitest';

vi.mock('data/config', () => ({
	Framework: { NET: 'NET', Node: 'NodeJs' },
}));
