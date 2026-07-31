import * as fs from 'node:fs';
import { Unzipper } from 'infrastructure/unzipper';
import { createExtractorFromFile } from 'node-unrar-js'; // Adjust based on your actual import
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

vi.mock('node:fs');
vi.mock('node:path', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:path')>();
	return {
		...actual,
		resolve: vi.fn((p) => `/abs/${p}`),
	};
});

vi.mock('node-unrar-js', () => ({
	createExtractorFromFile: vi.fn(),
}));

describe('Unzipper Service', () => {
	let unzipper: Unzipper;

	const mockExtractor = {
		extract: vi.fn().mockReturnValue({
			files: [{ name: 'file1.txt' }, { name: 'file2.txt' }],
		}),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		unzipper = new Unzipper();
		(createExtractorFromFile as Mock).mockResolvedValue(mockExtractor);
	});

	it('Should successfully extract files when archive exists', async () => {
		(fs.existsSync as Mock).mockReturnValue(true);

		await unzipper.extract('archive.rar', 'dist/');

		expect(fs.existsSync).toHaveBeenCalledWith('/abs/archive.rar');
		expect(createExtractorFromFile).toHaveBeenCalledWith({
			filepath: '/abs/archive.rar',
			targetPath: '/abs/dist/',
		});
		expect(mockExtractor.extract).toHaveBeenCalled();
	});

	it('Should create the destination directory if it does not exist', async () => {
		(fs.existsSync as Mock)
			.mockReturnValueOnce(true)
			.mockReturnValueOnce(false);

		await unzipper.extract('archive.rar', 'new-folder/');

		expect(fs.mkdirSync).toHaveBeenCalledWith('/abs/new-folder/', {
			recursive: true,
		});
		expect(mockExtractor.extract).toHaveBeenCalled();
	});

	it('Should throw an error if the archive path is not found', async () => {
		(fs.existsSync as Mock).mockReturnValue(false);

		await expect(unzipper.extract('missing.rar', 'dist/')).rejects.toThrow(
			'Extraction error: Archive not found at path: /abs/missing.rar',
		);

		expect(createExtractorFromFile).not.toHaveBeenCalled();
	});

	it('Should wrap and throw an error if createExtractorFromFile fails', async () => {
		(fs.existsSync as Mock).mockReturnValue(true);
		(createExtractorFromFile as Mock).mockRejectedValue(
			new Error('Lib Failure'),
		);

		await expect(unzipper.extract('archive.rar', 'dist/')).rejects.toThrow(
			'Extraction error: Lib Failure',
		);
	});

	it('should handle extraction errors from the extractor object', async () => {
		(fs.existsSync as Mock).mockReturnValue(true);
		mockExtractor.extract.mockImplementation(() => {
			throw new Error('Disk Full');
		});

		await expect(unzipper.extract('archive.rar', 'dist/')).rejects.toThrow(
			'Extraction error: Disk Full',
		);
	});
});
