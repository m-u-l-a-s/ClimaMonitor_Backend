import { ConflictException, Injectable } from '@nestjs/common';
import * as nano from 'nano';
import { CulturaDto } from './dto/cultura.dto';
import { CulturaDocument, Cultura } from './entities/cultura.entity';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { addDays, format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class CulturaService {
  private readonly repository: nano.DocumentScope<Cultura>;

  private readonly httpService = new HttpService();

  constructor(@InjectModel(Cultura.name) private culturaModel: Model<Cultura>) {}

  async create(data: CulturaDto): Promise<CulturaDocument> {
    try {
      const clima = await this.getClima(data.ponto_cultivo.latitude, data.ponto_cultivo.longitude);

      data.temperaturas = clima.temperaturas;
      data.pluviometrias = clima.pluviometrias;
      data.lastUpdate = formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");

      const culturaCreated = new this.culturaModel(data);

      return culturaCreated.save();
    } catch (error) {
      data.temperaturas = [];
      data.pluviometrias = [];
      const culturaCreated = new this.culturaModel(data);
      return culturaCreated.save();
    }
  }

  private async getClima(latitude: string, longitude: string, startDate?: string, endDate?: string) {
    const today = formatInTimeZone(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');

    const options = {
      method: 'GET',
      url: `https://meteostat.p.rapidapi.com/point/daily?lat=${latitude}&lon=${longitude}&start=${startDate ?? today}&end=${endDate ?? today}`,
      headers: {
        'X-RapidAPI-Key': process.env.METEOSTAT_API_KEY,
        'X-RapidAPI-Host': 'meteostat.p.rapidapi.com',
      },
    };

    try {
      const response = await firstValueFrom(this.httpService.get(options.url, { headers: options.headers }));
      const data = response.data;

      if (!data.data || data.data.length === 0) {
        throw new ConflictException('Nenhum dado climático disponível para o intervalo fornecido');
      }

      const temperaturas = data.data.map((dia: any) => ({
        data: dia.date,
        temperatura: dia.tavg,
      }));

      const pluviometrias = data.data.map((dia: any) => ({
        data: dia.date,
        pluviometria: dia.prcp,
      }));

      return { temperaturas, pluviometrias };
    } catch (error) {
      console.log(error);
      throw new ConflictException('Erro ao buscar dados climáticos');
    }
  }

  async findAll(): Promise<CulturaDocument[]> {
    try {
      const culturas = await this.culturaModel.find().exec();

      const hoje = formatInTimeZone(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
      console.log('hoje :' + hoje);

      for (const cultura of culturas) {
        console.log('cultura.lastUpdate :' + cultura.lastUpdate);

        const ultimaAtualizacao = cultura.lastUpdate ? format(new Date(cultura.lastUpdate), 'yyyy-MM-dd') : null;
        console.log('ultimaAtualizacao :' + ultimaAtualizacao);

        if (!ultimaAtualizacao || ultimaAtualizacao !== hoje) {
          const startDate = ultimaAtualizacao ? format(addDays(parseISO(ultimaAtualizacao), 1), 'yyyy-MM-dd') : hoje;
          console.log('startDate :' + startDate);

          const novosDados = await this.getClima(
            cultura.ponto_cultivo.latitude,
            cultura.ponto_cultivo.longitude,
            startDate,
            hoje,
          );

          novosDados.temperaturas.forEach((novaTemp) => {
            const existe = cultura.temperaturas.some(
              (temp) => temp.data === novaTemp.data || novaTemp.data < temp.data,
            );
            if (!existe) {
              cultura.temperaturas.push(novaTemp);
            }
          });

          novosDados.pluviometrias.forEach((novaPluv) => {
            const existe = cultura.pluviometrias.some(
              (pluv) => pluv.data === novaPluv.data || novaPluv.data < pluv.data,
            );
            if (!existe) {
              cultura.pluviometrias.push(novaPluv);
            }
          });

          cultura.lastUpdate = formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");

          await this.culturaModel.updateOne({ _id: cultura._id }, { $set: cultura });
        }
      }

      return culturas;
    } catch (error) {
      throw new Error(error);
    }
  }

  async findOne(id: string): Promise<CulturaDocument> {
    try {
      return this.culturaModel.findById(id).exec();
    } catch (error) {
      throw new Error(error);
    }
  }

  async remove(id: string): Promise<{ deletedCount?: number }> {
    return this.culturaModel.deleteOne({ _id: id }).exec();
  }

  async update(id: string, data: CulturaDto): Promise<CulturaDocument> {
    return this.culturaModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }
}
