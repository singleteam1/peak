import { spinner } from '@clack/prompts';
import { accent, lime, warn } from 'common';
import type { ICommandEnvironments } from 'core/types';
import type { IPowershellService } from 'infrastructure';
import type { IConfigService } from 'infrastructure/configService/config.service';
import { ExportHandlerHandler } from 'modules/loader/handlers/export-config.handler';
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type Mocked,
	vi,
} from 'vitest';

vi.mock('@clack/prompts', () => ({
	spinner: vi.fn(() => ({
		start: vi.fn(),
		stop: vi.fn(),
	})),
}));

vi.mock('common', async (importOriginal) => {
	const actual = await importOriginal<typeof import('common')>();

	return {
		...actual,
		warn: { bold: vi.fn((str) => `[WARN] ${str}`) },
		lime: vi.fn((str) => `[LIME] ${str}`),
		accent: { bold: vi.fn((str) => `[ACCENT] ${str}`) },
		Website: 'https://example.com',
	};
});

describe('ExportHandlerHandler', () => {
	let configServiceMock: Mocked<IConfigService>;
	let psMock: Mocked<IPowershellService>;
	let handler: ExportHandlerHandler;
	let consoleSpy: any;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2023, 10, 15));

		// 3. Cast using the directly imported Mocked type
		configServiceMock = {
			getConfig: vi.fn().mockResolvedValue({ key: 'value' }),
		} as unknown as Mocked<IConfigService>;

		psMock = {
			execute: vi.fn().mockResolvedValue(undefined),
		} as unknown as Mocked<IPowershellService>;

		consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		handler = new ExportHandlerHandler(configServiceMock, psMock);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	describe('handle()', () => {
		it('should successfully execute the export pipeline', async () => {
			const envMock = { calledDir: '/fake/directory' } as ICommandEnvironments;
			const renderSpy = vi.spyOn(handler, 'renderSuccessfullMessage');

			await handler.handle([], envMock);

			expect(spinner).toHaveBeenCalled();
			const spinnerMockInstance = vi.mocked(spinner).mock.results[0].value;
			expect(spinnerMockInstance.start).toHaveBeenCalledWith(
				'Exporting config',
			);

			expect(configServiceMock.getConfig).toHaveBeenCalledOnce();
			const expectedJsonStr = JSON.stringify({ key: 'value' });
			const expectedCommand = `'${expectedJsonStr}' | Set-Content -Path "config-2023-10-3.json"`;

			expect(psMock.execute).toHaveBeenCalledWith(
				expectedCommand,
				'/fake/directory',
			);

			expect(spinnerMockInstance.stop).toHaveBeenCalledWith('Success!');
			expect(renderSpy).toHaveBeenCalledOnce();
		});
	});

	describe('renderSuccessfullMessage()', () => {
		it('should format and log the success message properly', () => {
			handler.renderSuccessfullMessage();

			const expectedMessage =
				`[WARN] \nConfig was successfully exported.` +
				`\n\nAdd custom plugins [LIME] peak plugin\n\n` +
				`Discover [ACCENT] https://example.com to check the documentation\n`;

			expect(consoleSpy).toHaveBeenCalledWith(expectedMessage);

			expect(warn.bold).toHaveBeenCalledWith(
				'\nConfig was successfully exported.',
			);
			expect(lime).toHaveBeenCalledWith('peak plugin');
			expect(accent.bold).toHaveBeenCalledWith('https://example.com');
		});
	});
});
