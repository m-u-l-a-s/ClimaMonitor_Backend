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
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
  async findOne(@Param('id') id: number) {
    const user = await this.userService.findOne(id);
    if (!user) {
      return { message: `User with ID ${id} not found` };
    }
    return user;
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
  async update(@Param('id') id: number, @Body() updateUserDto: UpdateUserDto) {
    const result = await this.userService.update(id, updateUserDto);
    if ('error' in result) {
      if (result.error === 'User not found') {
        throw new NotFoundException(result.error);
      }
      throw new ConflictException('Username already exists');
    }
    return result;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: number) {
    const user = await this.userService.findOne(id);
    if (!user) {
      return { message: `User with ID ${id} not found` };
    }
    await this.userService.remove(id);
    return { message: 'User removed successfully' };
  }
}