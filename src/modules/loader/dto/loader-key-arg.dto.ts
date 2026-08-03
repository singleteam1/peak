import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class LoaderPluginArgDto {
	@IsOptional()
	@IsString({ message: 'Key is bad' })
	@IsNotEmpty({ message: 'Key is empty' })
	key: string;

	@IsOptional()
	@IsString({ message: 'Url isnt valid' })
	@IsNotEmpty({ message: 'Url is empty' })
	@IsUrl({}, { message: 'Url very bad' })
	url: string;
}

export class LoaderRemovePluginDto {
	@IsString({ message: 'Key is bad' })
	@IsNotEmpty({ message: 'Key is empty' })
	key: string;
}

export class LoaderConfigNameDto {
	@IsOptional()
	@IsString({ message: 'Name is bad' })
	@IsNotEmpty({ message: 'Name is empty' })
	name: string;
}
