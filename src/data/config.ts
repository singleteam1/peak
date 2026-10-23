export enum Framework {
	NET,
	Node,
}
export interface IProjectMetadata {
	framework: Framework;
	isInstallDeps?: boolean;
	isChangeName?: boolean;
	isInitGit?: boolean;
}
export interface IProjectData {
	key: string;
	url: string;
	metadata: IProjectMetadata;
}

export interface IConfig {
	projects: Array<IProjectData>;
}

export const config: IConfig = {
	projects: [
		{
			key: 'nest-app',
			url: 'https://github.com/singleteam1/nest-app',
			metadata: {
				framework: Framework.Node,
				isChangeName: true,
				isInstallDeps: true,
				isInitGit: true,
			},
		},
		{
			key: 'elysia-app',
			url: 'https://github.com/singleteam1/elysia-app',
			metadata: {
				framework: Framework.Node,
				isChangeName: true,
				isInstallDeps: true,
				isInitGit: true,
			},
		},
		{
			key: 'next-app',
			url: 'https://github.com/singleteam1/next-app',
			metadata: {
				framework: Framework.Node,
				isChangeName: true,
				isInstallDeps: true,
				isInitGit: true,
			},
		},
		{
			key: 'nest-rest',
			url: 'https://github.com/singleteam1/nest-rest.git',
			metadata: {
				framework: Framework.Node,
				isChangeName: true,
				isInstallDeps: true,
				isInitGit: true,
			},
		},
		{
			key: 'nest-ql',
			url: 'https://github.com/singleteam1/nest-ql.git',
			metadata: {
				framework: Framework.Node,
				isChangeName: true,
				isInstallDeps: true,
				isInitGit: true,
			},
		},
		{
			key: 'net-rest-ca',
			url: 'https://github.com/singleteam1/net-rest-ca.git',
			metadata: {
				framework: Framework.NET,
				isChangeName: true,
				isInstallDeps: false,
				isInitGit: true,
			},
		},
	],
};

export const configKey = 'conf';
