import { promises as fs } from 'fs';
import type { CommandResult } from 'infrastructure/powershell';

export async function getFileContent(filePath: string): Promise<CommandResult> {
	try {
		const content = await fs.readFile(filePath, 'utf-8');
		return { success: true, output: content.trim() };
	} catch (error: any) {
		return {
			success: false,
			error: `Failed to read file: ${error.message}`,
		};
	}
}
