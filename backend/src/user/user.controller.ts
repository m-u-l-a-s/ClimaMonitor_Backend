import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  NotFoundException,
  HttpCode,
  HttpStatus,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll() {
    const users = await this.userService.findAll();
    if (users.length === 0) {
      return { message: 'No users found' };
    }
    return users;
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    try {
      const user = await this.userService.findOne(id);
      if (!user) {
        return { message: `Usuário com ID ${id} não encontrado` };
      }
      return user;
    } catch (error) {
      return { message: error.message };
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto) {
    const result = await this.userService.create(createUserDto);
    if ('error' in result) {
      throw new ConflictException(result.error);
    }
    return result;
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const payload = {
      ...updateUserDto,
      password: updateUserDto.password ? await bcrypt.hash(updateUserDto.password, 10) : undefined,
    };

    const result = await this.userService.update(id, payload);

    if (result.error === 'User not found') {
      throw new NotFoundException(result.error);
    } else if (result.error === 'Email already exists') {
      throw new ConflictException(result.error);
    }

    return { message: 'Profile updated successfully', user: result.user };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    const user = await this.userService.findOne(id);
    if (!user) {
      return { message: `User with ID ${id} not found` };
    }
    await this.userService.remove(id);
    return { message: 'User removed successfully' };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto) {
    const { email, password } = loginDto;
    const result = await this.userService.login(email, password);

    if ('error' in result) {
      if (result.error === 'Usuário inválido' || result.error === 'Senha incorreta') {
        throw new UnauthorizedException(result.error);
      }
      throw new ConflictException('Erro inesperado');
    }

    return result;
  }

  @Post('check-email')
  @HttpCode(200)
  async checkEmail(@Body() checkEmailDto: { email: string }) {
    const result = await this.userService.loginWithoutPassword(checkEmailDto.email);

    if ('error' in result) {
      if (result.error === 'Usuário inválido') {
        throw new UnauthorizedException(result.error);
      }
      throw new ConflictException('Erro inesperado');
    }

    return result;
  }
}
