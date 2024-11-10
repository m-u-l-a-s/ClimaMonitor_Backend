import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CreateUserDto } from '../dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>

@Schema()
export class User {
  @Prop({ unique: true, type: String, required: true })
  username: string;

  @Prop({type: String, required: true})
  password: string;

  @Prop({ type: String, required: true })
  lastUpdate?: string;

  @Prop({ type: String, required: false})
  createdAt?: string

  @Prop({ type: String, required: false})
  deletedAt?: string

  constructor( dto : CreateUserDto){
    this.username = dto.username
    this.password = bcrypt.hash(dto.password)
  }
}

export const UserSchema = SchemaFactory.createForClass(User);
