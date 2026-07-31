import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ExplorerService, type IExplorerService } from 'infrastructure';
import {
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from 'vitest';

vi.mock('node:fs/promises');
vi.mock('node:path');

describe('Explorer Service', () => {
	let explorer: IExplorerService;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	beforeAll(() => {
		explorer = new ExplorerService();
	});

	it('Should create directory and write file with content', async () => {
		const filePath = '/path/to/file.txt';
		const dirPath = '/path/to';
		const content = 'hello world';

		(path.dirname as Mock).mockReturnValue(dirPath);

		await explorer.createFile(filePath, content);

		expect(path.dirname).toHaveBeenCalledWith(filePath);
		expect(fs.mkdir).toHaveBeenCalledWith(dirPath, { recursive: true });
		expect(fs.writeFile).toHaveBeenCalledWith(filePath, content, 'utf8');
	});

	it('Should use empty string if no content is provided', async () => {
		const filePath = 'test.txt';
		(path.dirname as Mock).mockReturnValue('.');

		await explorer.createFile(filePath);

		expect(fs.writeFile).toHaveBeenCalledWith(filePath, '', 'utf8');
	});

	it('Should remove file with recursive and force options', async () => {
		const target = 'some/folder';
		await explorer.delete(target);

		expect(fs.rm).toHaveBeenCalledWith(target, {
			recursive: true,
			force: true,
		});
	});

	it('Should rename file with correct paths', async () => {
		await explorer.rename('old.txt', 'new.txt');
		expect(fs.rename).toHaveBeenCalledWith('old.txt', 'new.txt');
	});

	it('Should return true if access succeeds', async () => {
		(fs.access as Mock).mockResolvedValue(undefined);

		const result = await explorer.exists('exists.txt');

		expect(result).toBe(true);
		expect(fs.access).toHaveBeenCalledWith('exists.txt');
	});

	it('Should return false if access throws', async () => {
		(fs.access as Mock).mockRejectedValue(new Error('Not found'));

		const result = await explorer.exists('missing.txt');
		expect(result).toBe(false);
	});

	it('Should return file content as string while reading file', async () => {
		const mockContent = 'file data';
		(fs.readFile as Mock).mockResolvedValue(mockContent);

		const result = await explorer.readFile('read.txt');

		expect(result).toBe(mockContent);
		expect(fs.readFile).toHaveBeenCalledWith('read.txt', 'utf8');
	});
});
