import { IsString, Length, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @Length(4, 30, {
    message: 'Username must be between 4 and 30 characters long',
  })
  @IsNotEmpty({ message: 'Username is required' })
  readonly username: string;

  @IsString()
  @Length(6, 20, {
    message: 'Password must be between 6 and 20 characters long',
  })
  @IsNotEmpty({ message: 'Password is required' })
  readonly password: string;
}