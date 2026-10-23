import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class NestPrismaModelDto {
	@Matches(/^[a-z]+$/, {
		message: 'Model name is not valid, use noun: post, blog',
	})
	@IsString({ message: 'Model name must be string value' })
	@IsNotEmpty({ message: 'Model name cannot be empty' })
	name: string;
}
