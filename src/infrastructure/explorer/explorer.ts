import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface IExplorerService {
	createFolder(dirPath: string): Promise<void>;
	createFile(filePath: string, content?: string): Promise<void>;
	delete(targetPath: string): Promise<void>;
	rename(oldPath: string, newPath: string): Promise<void>;
	exists(targetPath: string): Promise<boolean>;
	readFile(filePath: string): Promise<string>;
	copyFile(source: string, destination: string): Promise<boolean>;
	moveFile(source: string, destination: string): Promise<boolean>;
}

export class ExplorerService implements IExplorerService {
	public async createFolder(dirPath: string): Promise<void> {
		await fs.mkdir(dirPath, { recursive: true });
	}

	async createFile(filePath: string, content?: string): Promise<void> {
		const dir = path.dirname(filePath);
		await this.createFolder(dir);
		await fs.writeFile(filePath, content ?? '', 'utf8');
	}

	public async delete(targetPath: string): Promise<void> {
		await fs.rm(targetPath, { recursive: true, force: true });
	}

	public async rename(oldPath: string, newPath: string): Promise<void> {
		await fs.rename(oldPath, newPath);
	}

	public async exists(targetPath: string): Promise<boolean> {
		try {
			await fs.access(targetPath);
			return true;
		} catch {
			return false;
		}
	}

	public async readFile(filePath: string): Promise<string> {
		return await fs.readFile(filePath, 'utf8');
	}

	public async copyFile(source: string, destination: string): Promise<boolean> {
		try {
			if (!(await this.exists(source))) {
				return false;
			}

			await fs.copyFile(source, destination);
			return true;
		} catch (error) {
			console.log(error);
			return false;
		}
	}

	public async moveFile(source: string, destination: string): Promise<boolean> {
		try {
			if (!(await this.exists(source))) {
				return false;
			}

			await fs.cp(source, destination, { recursive: true });
			return true;
		} catch (error) {
			console.log(error);
			return false;
		}
	}
}
