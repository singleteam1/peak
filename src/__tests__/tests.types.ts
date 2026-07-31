import type { vi } from 'vitest';

export type Mock = ReturnType<typeof vi.fn>;
export type SpyMock = ReturnType<typeof vi.spyOn>;
