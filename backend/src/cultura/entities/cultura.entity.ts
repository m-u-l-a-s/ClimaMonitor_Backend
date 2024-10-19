import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { CulturaDto } from '../dto/cultura.dto';

export type CulturaDocument = HydratedDocument<Cultura>;

export type Temperatura = {
  data: string;
  temperatura_media: number;
  temperatura_max : number;
  temperatura_min : number;
};

export type Pluviometria = {
  data: string;
  pluviometria: number;
};

export type Localização = {
  latitude: string;
  longitude: string;
};

export type Alerta = {
  [date: string]: number;
};

@Schema()
export class Cultura {
  @Prop({ type: Object, required: true }) // Definindo explicitamente que é um objeto e é obrigatório
  ponto_cultivo: Localização;

  @Prop({ type: String, required: true }) // Nome da cultura como string obrigatória
  nome_cultivo: string;
  
  @Prop({ type: Number, required: true }) // Temperatura máxima como número
  temperatura_max: number;
  
  @Prop({ type: Number, required: true }) // Pluviometria máxima como número
  pluviometria_max: number;
  
  @Prop({ type: Number, required: true }) // Temperatura mínima como número
  temperatura_min: number;
  
  @Prop({ type: Number, required: true }) // Pluviometria mínima como número
  pluviometria_min: number;
  
  @Prop({ type: [{ data: String, temperatura_media: Number, temperatura_min: Number, temperatura_max: Number }], required: true }) // Array de objetos de temperatura
  temperaturas: Temperatura[];
  
  @Prop({ type: [{ data: String, pluviometria: Number }], required: true }) // Array de objetos de pluviometria
  pluviometrias: Pluviometria[];
  
  @Prop({ type: [{ type: Map, of: Number }], required: true }) // Mapeando a estrutura do alerta
  alertasTemp: Alerta[];
  
  @Prop({ type: [{ type: Map, of: Number }], required: true }) // Mapeando a estrutura do alerta
  alertasPluvi: Alerta[];

  @Prop({ type: String, required: true }) // Mapeando a última atualização dos dados
  lastUpdate: string;

  @Prop({ type: String, required: true})
  createdAt: string

  @Prop({ type: String, required: true})
  deletedAt: string

  constructor(dto: CulturaDto) {
    this.ponto_cultivo = dto.ponto_cultivo;
    this.nome_cultivo = dto.nome_cultivo;
    this.temperatura_max = dto.temperatura_max;
    this.pluviometria_max = dto.pluviometria_max;
    this.temperatura_min = dto.temperatura_min;
    this.pluviometria_min = dto.pluviometria_min;
    this.temperaturas = dto.temperaturas;
    this.pluviometrias = dto.pluviometrias;
    this.alertasTemp = dto.alertasTemp;
    this.alertasPluvi = dto.alertasPluvi;
    this.lastUpdate = dto.lastUpdate;
    this.createdAt = dto.createdAt;
    this.deletedAt = dto.deletedAt;
  }
}

export const CulturaSchema = SchemaFactory.createForClass(Cultura);
