import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, ObjectId } from 'mongoose';

export type CulturaDocument = HydratedDocument<Cultura>;

export type Temperatura = {
  [x: string]: any;
  data: string;
  temperatura_media: number;
  temperatura_max: number;
  temperatura_min: number;
};

export type Pluviometria = {
  [x: string]: any;
  data: string;
  pluviometria: number;
};

export type Localização = {
  latitude: string;
  longitude: string;
};

@Schema()
export class Cultura {
  @Prop({ type: Object, required: true })
  ponto_cultivo: Localização;

  @Prop({ type: String, required: true })
  nome_cultivo: string;

  @Prop({ type: Number, required: true })
  temperatura_max: number;

  @Prop({ type: Number, required: true })
  pluviometria_max: number;

  @Prop({ type: Number, required: true })
  temperatura_min: number;

  @Prop({ type: Number, required: true })
  pluviometria_min: number;

  @Prop({
    type: [{ data: String, temperatura_media: Number, temperatura_max: Number, temperatura_min: Number }],
    required: true,
  })
  temperaturas: Temperatura[];

  @Prop({ type: [{ data: String, pluviometria: Number }], required: true })
  pluviometrias: Pluviometria[];

  @Prop({ type: [{ type: Map, of: Number }], required: true })
  alertasTemp: Temperatura[];

  @Prop({ type: [{ type: Map, of: Number }], required: true })
  alertasPluvi: Pluviometria[];

  @Prop({ type: String, required: true })
  lastUpdate: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  deletedAt: string;

  @Prop({ type: String, required: true })
  userId: string;
}

export const CulturaSchema = SchemaFactory.createForClass(Cultura);
