import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Localização, Temperatura, Pluviometria, Alerta, CulturaDto } from '../dto/cultura.dto';
import { HydratedDocument } from 'mongoose';

export type CulturaDocument = HydratedDocument<CulturaEntity>;

@Schema()
export class CulturaEntity {
  @Prop()
  ponto_cultivo: Localização;

  @Prop()
  nome_cultivo: string;
  
  @Prop()
  temperatura_max: number;
  
  @Prop()
  pluviometria_max: number;
  
  @Prop()
  temperatura_min: number;
  
  @Prop()
  pluviometria_min: number;
  
  @Prop()
  temperaturas: Temperatura[];
  
  @Prop()
  pluviometrias: Pluviometria[];
  
  @Prop()
  alertasTemp: Alerta[];
  
  @Prop()
  alertasPluvi: Alerta[];

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
  }
}

export const CulturaSchema = SchemaFactory.createForClass(CulturaEntity)

