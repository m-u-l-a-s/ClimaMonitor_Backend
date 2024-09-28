import { ConflictException, Injectable } from '@nestjs/common';
import * as nano from 'nano';
import { CulturaDto } from './dto/cultura.dto';
import { CulturaDocument, CulturaEntity } from './entities/cultura.entity';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { format } from 'date-fns';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class CulturaService {
  private readonly repository: nano.DocumentScope<CulturaEntity>;

  private readonly httpService = new HttpService();

  constructor(@InjectModel(CulturaEntity.name) private culturaModel : Model<CulturaEntity>) {}

  async create(data: CulturaDto): Promise<CulturaEntity> {
    const clima = await this.getClima(data.ponto_cultivo.latitude, data.ponto_cultivo.longitude);

    data.temperaturas = clima.temperatura;
    data.pluviometrias = clima.pluviometria;

    const culturaCreated = new this.culturaModel(data)

    return culturaCreated.save();
  }

  private async getClima(latitude: string, longitude: string) {
    const today = format(new Date(), 'yyyy-MM-dd');

    const options = {
      method: 'GET',
      url: `https://meteostat.p.rapidapi.com/point/daily?lat=${latitude}&lon=${longitude}&start=${today}&end=${today}`,
      headers: {
        'X-RapidAPI-Key': process.env.METEOSTAT_API_KEY,
        'X-RapidAPI-Host': 'meteostat.p.rapidapi.com',
      },
    };

    try {
      const response = await firstValueFrom(this.httpService.get(options.url, { headers: options.headers }));
      const data = response.data;

      const temperatura = [
        {
          data: data.meta.generated,
          temperatura: data.data[0].tavg,
        },
      ];

      const pluviometria = [
        {
          data: data.meta.generated,
          pluviometria: data.data[0].prcp,
        },
      ];

      return { temperatura, pluviometria };
    } catch (error) {
      console.log(error);
      throw new ConflictException('Erro ao buscar dados climáticos');
    }
  }

  async findAll(): Promise<CulturaDocument[]> {
    try {
      return this.culturaModel.find().exec()
    } catch (error) {
      throw new Error(error);
    }
  }

  async findOne(id: string): Promise<CulturaDocument> {
    try {
      return this.culturaModel.findById(id).exec()
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
