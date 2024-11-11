import { User } from './entities/user.entity';
import { ConflictException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { HttpStatusCode } from 'axios';
import { formatInTimeZone } from 'date-fns-tz';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userRepository: Model<User>,
    private readonly jwtService: JwtService,
  ) {}

  async findAll(): Promise<User[]> {
    return await this.userRepository.find().exec();
  }

  async findOne(id: string): Promise<User | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error(`ID inválido: ${id}`);
    }

    return await this.userRepository.findById(id).exec();
  }

  async findOneByEmail(email: string): Promise<User> {
    return await this.userRepository.findOne({ email }).exec();
  }

  async create(user: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: user.email },
    });

    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);
    const hoje = formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");

    const newUser = await this.userRepository.create({
      email: user.email,
      name: user.name,
      lastName: user.lastName,
      password: hashedPassword,
      createdAt: hoje,
      lastUpdate: hoje,
      deletedAt: '',
    });

    return this.userRepository.create(newUser);
  }

  async update(id: String, user: Partial<User>): Promise<{ user?: User; error?: string }> {
    const existingUser = await this.userRepository.findById(id).exec();

    if (!existingUser) {
      return { error: 'User not found' };
    }

    if (user.email && user.email !== existingUser.email) {
      const emailExists = await this.userRepository.findOne({ email: user.email });
      if (emailExists) {
        return { error: 'Email already exists' };
      }
    }

    user.lastUpdate = formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");

    await this.userRepository.findByIdAndUpdate(id, user);
    const updatedUser = await this.userRepository.findById(id);
    return { user: updatedUser };
  }

  async remove(id: string): Promise<HttpStatus> {
    try {
      const user = await this.userRepository.findById(id).exec();

      if (!user) {
        return HttpStatus.NOT_FOUND;
      }

      user.deletedAt = formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");

      await this.userRepository.findByIdAndUpdate(id, user).exec();
      return HttpStatus.OK;
    } catch (error) {
      console.error(error);
      return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  async login(email: string, password: string) {
    const user = await this.userRepository.findOne({ email });

    if (!user) {
      return { error: 'Usuário inválido' };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return { error: 'Senha incorreta' };
    }

    const payload = { email: user.email, sub: user.id };
    const token = await this.jwtService.signAsync(payload, { expiresIn: '1h', secret: process.env.TOKEN });

    return {
      token: token,
      userId: user.id,
    };
  }
}
