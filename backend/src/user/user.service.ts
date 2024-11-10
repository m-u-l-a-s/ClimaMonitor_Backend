import { Injectable } from '@nestjs/common';
import { User, UserDocument } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HttpStatusCode } from 'axios';
import { formatInTimeZone } from 'date-fns-tz';
import { JwtService } from '@nestjs/jwt';
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

  async update(id: string, user: Partial<User>): Promise<UserDocument> {
    user.lastUpdate = formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");
    return await this.userRepository.findByIdAndUpdate(id, user, { new: true }).exec();
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
    const token = this.jwtService.sign(payload);
    return { token };
  }
}
