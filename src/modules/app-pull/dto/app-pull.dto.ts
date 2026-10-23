import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AppPullKeyDto {
	@IsOptional()
	@IsString({ message: 'Key is bad' })
	@IsNotEmpty({ message: 'Key is empty' })
	key: string;
}

export class AppNameDto {
	@IsString({ message: 'Name is not correct' })
	@IsNotEmpty({ message: 'Name is empty' })
	name: string;
}
