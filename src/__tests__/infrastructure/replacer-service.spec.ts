import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { LogOutput } from 'common/utils';
import {
	type IReplacerService,
	ReplacerService,
} from 'infrastructure/replacer';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

vi.mock('node:fs/promises');
vi.mock('node:path', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:path')>();
	return {
		...actual,
		resolve: vi.fn((p) => `/absolute/${p}`),
		basename: vi.fn((p) => p.split('/').pop()),
	};
});
// vi.mock("infrastructure", async (importOriginal) => {
//   const actual = await importOriginal<any>();
//   return {
//     ...actual,
//     LogOutput: mockLogOutput,
//   };
// });

vi.mock('common/utils', () => ({
	LogOutput: {
		LogError: vi.fn(),
	},
}));

describe('Replacer Service', () => {
	let replacer: IReplacerService;

	beforeEach(() => {
		vi.clearAllMocks();
		replacer = new ReplacerService();
	});

	it('Should successfully replace text and write to file', async () => {
		const log = {
			pathToFile: 'test.txt',
			searchValue: 'old',
			replaceValue: 'new',
		};
		(fs.readFile as Mock).mockResolvedValue('this is old content');

		await replacer.replaceInFile(log);

		expect(fs.writeFile).toHaveBeenCalledWith(
			expect.any(String),
			'this is new content',
			'utf-8',
		);
		expect(LogOutput.LogError).not.toHaveBeenCalled();
	});

	it('Should log an error and not write if no matches are found', async () => {
		const log = {
			pathToFile: 'test.txt',
			searchValue: 'missing',
			replaceValue: 'new',
		};
		(fs.readFile as Mock).mockResolvedValue('content');

		await replacer.replaceInFile(log);

		expect(fs.writeFile).not.toHaveBeenCalled();
		expect(LogOutput.LogError).toHaveBeenCalledWith(
			expect.stringContaining('No matches found'),
		);
	});

	it('Should throw a wrapped error if file system fails', async () => {
		(fs.readFile as Mock).mockRejectedValue(new Error('Read fail'));

		await expect(
			replacer.replaceInFile({
				pathToFile: 'x',
				searchValue: 'y',
				replaceValue: 'z',
			}),
		).rejects.toThrow('Text replacement failed: Read fail');
	});

	it('Should group changes by file and apply all of them', async () => {
		const changes = [
			{ pathToFile: 'file1.txt', searchValue: 'A', replaceValue: '1' },
			{ pathToFile: 'file1.txt', searchValue: 'B', replaceValue: '2' },
		];

		(fs.readFile as Mock).mockResolvedValue('A and B');
		await replacer.replaceInFiles(changes);

		expect(fs.readFile).toHaveBeenCalledTimes(1);
		expect(fs.writeFile).toHaveBeenCalledWith(
			expect.any(String),
			'1 and 2',
			'utf-8',
		);
	});

	it('Should apply changes across different files', async () => {
		const changes = [
			{ pathToFile: 'a.txt', searchValue: '1', replaceValue: '!' },
			{ pathToFile: 'b.txt', searchValue: '2', replaceValue: '@' },
		];

		(fs.readFile as Mock).mockResolvedValueOnce('1').mockResolvedValueOnce('2');

		await replacer.replaceInFiles(changes);

		expect(fs.writeFile).toHaveBeenCalledTimes(2);
	});

	it('Should throw an error if no modifications were made to a file', async () => {
		const changes = [
			{ pathToFile: 'test.txt', searchValue: 'nomatch', replaceValue: 'x' },
		];
		(fs.readFile as Mock).mockResolvedValue('original content');

		await expect(replacer.replaceInFiles(changes)).rejects.toThrow(
			'No changes were made to the file',
		);

		expect(fs.writeFile).not.toHaveBeenCalled();
	});
});
