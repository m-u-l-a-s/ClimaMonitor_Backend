import { User } from './entities/user.entity';
import { ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HttpStatusCode } from 'axios';
import { formatInTimeZone } from 'date-fns-tz';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userRepository: Model<User>,
    private readonly jwtService: JwtService
  ) { }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find().exec();
  }

  async findOne(id: string): Promise<User> {
    return await this.userRepository.findById(id).exec();
  }

  async findOneByUsername(username: string): Promise<User> {
    return await this.userRepository.findOne({ username: username }).exec();
  }

  async create(user: CreateUserDto): Promise<User> {

    const existingUser = await this.userRepository.findOne({
      where: { username: user.username },
    });

    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);
    const hoje = formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");
    
    const newUser = await this.userRepository.create({
      password: hashedPassword,
      lastUpdate: hoje,
      createdAt: hoje,
      deletedAt: "",
      username: user.username
    });
    return this.userRepository.create(newUser);
  }

  async update(id: String, user: Partial<User>): Promise<{ user?: User; error?: string }> {
    const existingUser = await this.userRepository.findById(id).exec();

    if (!existingUser) {
      return { error: 'User not found' };
    }

    if (user.username && user.username !== existingUser.username) {
      const usernameExists = await this.userRepository.findOne({ username: user.username });
      if (usernameExists) {
        return { error: 'Username already exists' };
      }
    }

    user.lastUpdate = formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");

    await this.userRepository.findByIdAndUpdate(id, user);
    const updatedUser = await this.userRepository.findById(id);
    return { user: updatedUser };
  }

  async remove(id: string): Promise<HttpStatusCode> {
    try {
      const user = await this.userRepository.findById(id).exec();
      user.deletedAt = formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");
      user.password = await bcrypt.hashSync(user.password, 10);
      await this.userRepository.findByIdAndUpdate(id, user).exec()
      return HttpStatusCode.Ok;
    } catch (error) {
      return HttpStatusCode.NotFound;
    }
  }

  async login(username: string, password: string) {
    const user = await this.userRepository.findOne({ username: username });

    if (!user) {
      return { error: 'Usuário inválido' };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return { error: 'Senha incorreta' };
    }

    const payload = { username: user.username, sub: user.id };
    const token = await this.jwtService.signAsync(payload, { expiresIn: "1h", secret: process.env.TOKEN})

    return {
      token : token,
      userId: user.id,
    };
  }
}
