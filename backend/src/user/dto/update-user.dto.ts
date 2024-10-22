import { IsString, Length, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @Length(4, 30, {
    message: 'Username must be between 4 and 30 characters long',
  })
  @IsOptional()
  readonly username?: string;

  @IsString()
  @Length(6, 20, {
    message: 'Password must be between 6 and 20 characters long',
  })
  @IsOptional()
  readonly password?: string;
}
