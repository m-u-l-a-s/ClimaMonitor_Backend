import { Localização, Temperatura, Pluviometria, Alerta, CulturaDto } from '../dto/cultura.dto';
import { iCultura } from './cultura.entity.interface';
import * as nano from 'nano';

export class CulturaEntity implements iCultura {
  _id?: string;
  _rev?: string;
  ponto_cultivo: Localização;
  nome_cultivo: string;
  temperatura_max: number;
  pluviometria_max: number;
  temperatura_min: number;
  pluviometria_min: number;
  temperaturas: Temperatura[];
  pluviometrias: Pluviometria[];
  alertasTemp: Alerta[];
  alertasPluvi: Alerta[];
  lastUpdate: string;

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
  }

  processAPIresponse(response: nano.DocumentInsertResponse) {
    if (response.ok) {
      this._id = response.id;
      this._rev = response.rev;
    }
  }
}
