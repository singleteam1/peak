export interface LockfileMetadata {
	lockfileName: string;
	packageManager: string;
}

export const lockfileList: LockfileMetadata[] = [
	{
		lockfileName: 'package-lock.json',
		packageManager: 'npm',
	},
	{
		lockfileName: 'yarn.lock',
		packageManager: 'yarn',
	},
	{
		lockfileName: 'pnpm-lock.yaml',
		packageManager: 'pnpm',
	},
	{
		lockfileName: 'bun.lockb',
		packageManager: 'bun',
	},
];
