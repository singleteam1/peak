import * as fs from 'node:fs';
import * as path from 'node:path';
import { createExtractorFromFile } from 'node-unrar-js';

export interface IUnzipper {
	extract(archivePath: string, destinationPath: string): Promise<void>;
}

export class Unzipper implements IUnzipper {
	public async extract(
		archivePath: string,
		destinationPath: string,
	): Promise<void> {
		try {
			const resolvedArchivePath = path.resolve(archivePath);
			const resolvedDestPath = path.resolve(destinationPath);

			if (!fs.existsSync(resolvedArchivePath)) {
				throw new Error(`Archive not found at path: ${resolvedArchivePath}`);
			}
			if (!fs.existsSync(resolvedDestPath)) {
				fs.mkdirSync(resolvedDestPath, { recursive: true });
			}

			const extractor = await createExtractorFromFile({
				filepath: resolvedArchivePath,
				targetPath: resolvedDestPath,
			});

			const extractedFiles = extractor.extract();

			for (const _file of extractedFiles.files) {
			}
		} catch (error: any) {
			throw new Error(`Extraction error: ${error.message}`);
		}
	}
}
