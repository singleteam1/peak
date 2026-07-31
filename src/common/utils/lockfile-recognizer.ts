import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import { lockfileList } from 'common/package-manager-data';

export interface IRecognizedLockfile {
	path: string;
	fileName: string;
	pm: string;
}

export async function defineLockfile(
	projectPath: string,
): Promise<IRecognizedLockfile | null> {
	try {
		for (const lockfile of lockfileList) {
			const lockfilePath = join(projectPath, lockfile.lockfileName);
			await fs.access(lockfilePath);
			return {
				path: lockfilePath,
				fileName: lockfile.lockfileName,
				pm: lockfile.packageManager,
			};
		}
	} catch (error) {}
	return null;
}
