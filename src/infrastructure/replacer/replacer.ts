import type { IChangeLog } from 'common/models/change-log.model';
import { LogOutput } from 'common/utils';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface IReplacerService {
	replaceInFile(changeLog: IChangeLog): Promise<void>;
	replaceInFiles(changes: IChangeLog[]): Promise<void>;
}

export class ReplacerService implements IReplacerService {
	public async replaceInFile(changeLog: IChangeLog): Promise<void> {
		const { pathToFile, searchValue, replaceValue } = changeLog;
		try {
			const resolvedPath = path.resolve(pathToFile);
			const fileContent = await fs.readFile(resolvedPath, 'utf-8');

			const updatedContent = fileContent.replace(searchValue, replaceValue);
			if (fileContent === updatedContent) {
				LogOutput.LogError(
					`No matches found. File left unchanged: ${path.basename(resolvedPath)}`,
				);
				return;
			}

			await fs.writeFile(resolvedPath, updatedContent, 'utf-8');
		} catch (error: any) {
			throw new Error(`Text replacement failed: ${error.message}`);
		}
	}

	public async replaceInFiles(changes: IChangeLog[]): Promise<void> {
		const groupedChanges = new Map<string, IChangeLog[]>();

		for (const change of changes) {
			const resolvedPath = path.resolve(change.pathToFile);
			if (!groupedChanges.has(resolvedPath)) {
				groupedChanges.set(resolvedPath, []);
			}
			groupedChanges.get(resolvedPath)!.push(change);
		}

		for (const [filePath, fileChanges] of groupedChanges.entries()) {
			try {
				let fileContent = await fs.readFile(filePath, 'utf-8');
				let hasModifications = false;

				for (const change of fileChanges) {
					const updatedContent = fileContent.replace(
						change.searchValue,
						change.replaceValue,
					);

					if (updatedContent !== fileContent) {
						fileContent = updatedContent;
						hasModifications = true;
					}
				}

				if (hasModifications) {
					await fs.writeFile(filePath, fileContent, 'utf-8');
				} else {
					throw new Error('No changes were made to the file');
				}
			} catch (error: any) {
				throw new Error(
					`Failed to apply changes to ${filePath}: ${error.message}`,
				);
			}
		}
	}
}
