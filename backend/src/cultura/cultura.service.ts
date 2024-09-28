import { ConflictException, Injectable } from '@nestjs/common';
import * as nano from 'nano';
import { CulturaDto } from './dto/cultura.dto';
import { CulturaEntity } from './entities/cultura.entity';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { addDays, format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

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

    data.temperaturas = clima.temperaturas;
    data.pluviometrias = clima.pluviometrias;
    data.lastUpdate = formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");

    const cultura: CulturaEntity = new CulturaEntity(data);
    const resp: nano.DocumentInsertResponse = await this.repository.insert(cultura);
    if (!resp.ok) {
      throw new ConflictException('Erro ao criar cultura');
    }
    cultura.processAPIresponse(resp);

    return cultura;
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

  async findAll(): Promise<CulturaEntity[]> {
    try {
      const resp = await this.repository.list({ include_docs: true });
      const culturas = resp.rows.map((row) => row.doc);

      const hoje = formatInTimeZone(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');

      for (const cultura of culturas) {
        const ultimaAtualizacao = cultura.lastUpdate ? format(new Date(cultura.lastUpdate), 'yyyy-MM-dd') : null;

        if (!ultimaAtualizacao || ultimaAtualizacao !== hoje) {
          const startDate = ultimaAtualizacao ? format(addDays(parseISO(ultimaAtualizacao), 1), 'yyyy-MM-dd') : hoje;

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

          await this.repository.insert(cultura);
        }
      }

      return culturas;
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
