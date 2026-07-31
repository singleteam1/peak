import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { finished } from 'stream/promises';

export interface IStorageService {
	downloadFile(url: string, destinationPath: string): Promise<void>;
}

export class StorageService implements IStorageService {
	async downloadFile(url: string, destinationPath: string): Promise<void> {
		const dir = path.dirname(destinationPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		const writer = fs.createWriteStream(destinationPath);

		try {
			const response = await axios({
				method: 'get',
				url: url,
				responseType: 'stream',
			});

			response.data.pipe(writer);

			await finished(writer);
		} catch (error) {
			writer.close();
			if (fs.existsSync(destinationPath)) {
				fs.unlinkSync(destinationPath);
			}
			throw new Error(
				`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}
}
