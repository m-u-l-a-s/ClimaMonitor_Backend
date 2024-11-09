import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: number): Promise<User> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findOneByUsername(username: string): Promise<User> {
    return this.userRepository.findOne({ where: { username } });
  }

  async create(user: Partial<User>): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { username: user.username },
    });

    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);
    const newUser = this.userRepository.create({
      ...user,
      password: hashedPassword,
    });
    return this.userRepository.save(newUser);
  }

  async update(id: number, user: Partial<User>): Promise<{ user?: User; error?: string }> {
    const existingUser = await this.userRepository.findOneBy({ id });

    if (!existingUser) {
      return { error: 'User not found' };
    }

    if (user.username && user.username !== existingUser.username) {
      const usernameExists = await this.userRepository.findOneBy({ username: user.username });
      if (usernameExists) {
        return { error: 'Username already exists' };
      }
    }

    await this.userRepository.update(id, user);
    const updatedUser = await this.userRepository.findOneBy({ id });
    return { user: updatedUser };
  }

  async remove(id: number): Promise<void> {
    await this.userRepository.delete(id);
  }

  async login(username: string, password: string) {
    const user = await this.userRepository.findOne({ where: { username } });

    if (!user) {
      return { error: 'Usuário inválido' };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return { error: 'Senha incorreta' };
    }

    const payload = { username: user.username, sub: user.id };
    const token = this.jwtService.sign(payload, { expiresIn: '1h' });

    return {
      token,
      userId: user.id,
    };
  }
}
