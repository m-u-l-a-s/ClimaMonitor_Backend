import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CreateUserDto } from '../dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop({ unique: true, type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  lastName: string;

  @Prop({ type: String, required: true })
  password: string;

  @Prop({ type: String, required: true })
  lastUpdate?: string;

  @Prop({ type: String, required: false })
  createdAt?: string;

  @Prop({ type: String, required: false })
  deletedAt?: string;

  constructor(dto: CreateUserDto) {
    this.email = dto.email;
    this.name = dto.name;
    this.lastName = dto.lastName;
    this.password = bcrypt.hash(dto.password);
  }
}

export const UserSchema = SchemaFactory.createForClass(User);
