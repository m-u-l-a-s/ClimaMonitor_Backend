import { ConflictException, Injectable } from '@nestjs/common';
import * as nano from 'nano';
import { CulturaDto } from './dto/cultura.dto';
import { CulturaEntity } from './entities/cultura.entity';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { format } from 'date-fns';

@Injectable()
export class CulturaService {
  private readonly repository: nano.DocumentScope<CulturaEntity>;

  constructor(private readonly httpService: HttpService) {
    const couchdb = require('nano')({
      url: 'http://127.0.0.1:5984',
      requestDefaults: {
        auth: {
          username: process.env.COUCH_USERNAME,
          password: process.env.COUCH_PASSWORD,
        },
      },
    });
    this.repository = couchdb.db.use(process.env.COUCH_DATABASE);
  }

  async create(data: CulturaDto): Promise<CulturaEntity> {
    const clima = await this.getClima(data.ponto_cultivo.latitude, data.ponto_cultivo.longitude);

    data.temperaturas = clima.temperatura;
    data.pluviometrias = clima.pluviometria;

    const cultura: CulturaEntity = new CulturaEntity(data);
    const resp: nano.DocumentInsertResponse = await this.repository.insert(cultura);
    if (!resp.ok) {
      throw new ConflictException('Erro ao criar cultura');
    }
    cultura.processAPIresponse(resp);

    return cultura;
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

  async findAll(): Promise<CulturaEntity[]> {
    try {
      const resp = await this.repository.list({ include_docs: true });
      return resp.rows.map((row) => row.doc);
    } catch (error) {
      throw new Error(error);
    }
  }

  async findOne(id: string): Promise<CulturaEntity> {
    return this.repository.get(id);
  }

  async remove(id: string, rev: string): Promise<nano.DocumentDestroyResponse> {
    return this.repository.destroy(id, rev);
  }

  async update(id: string, rev: string, data: CulturaDto): Promise<nano.DocumentInsertResponse> {
    const cultura: CulturaEntity = new CulturaEntity(data);
    return this.repository.insert(cultura, { docName: id, rev: rev });
  }
}
