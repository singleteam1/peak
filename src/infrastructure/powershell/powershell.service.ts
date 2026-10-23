// Exclude from coverage
import { spawn } from 'node:child_process';

export interface CommandResult {
	success: boolean;
	output?: string;
	error?: string;
}

export interface IPowershellService {
	execute(command: string, cwd?: string): Promise<CommandResult>;
}

export class PowershellService implements IPowershellService {
	public async execute(command: string, cwd?: string): Promise<CommandResult> {
		return new Promise((resolve) => {
			let outputData = '';
			let errorData = '';

			const ps = spawn(
				'powershell.exe',
				['-NoProfile', '-NonInteractive', '-Command', command],
				{
					cwd: cwd || process.cwd(),
					windowsHide: true,
				},
			);

			ps.stdout.on('data', (data) => {
				outputData += data.toString();
			});

			ps.stderr.on('data', (data) => {
				errorData += data.toString();
			});

			ps.on('close', (code) => {
				if (code === 0) {
					resolve({ success: true, output: outputData.trim() });
				} else {
					resolve({
						success: false,
						error: errorData.trim() || `Command failed with exit code ${code}`,
					});
				}
			});

			ps.on('error', (err) => {
				resolve({
					success: false,
					error: `Failed to start process: ${err.message}`,
				});
			});
		});
	}
}
