export interface IProjectData {
	key: string
	url: string
}

export interface IConfig {
	projects: Array<IProjectData>
}

export const config : IConfig = {
	projects: [
		{
			key: 'nest-rest',
			url: 'https://github.com/singleteam1/nest-rest.git'
		},
		{
			key: 'nest-ql',
			url: 'https://github.com/singleteam1/nest-ql.git'
		},
	]
}

export const configKey = "conf";