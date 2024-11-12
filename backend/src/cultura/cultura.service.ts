import { ConflictException, Injectable } from '@nestjs/common';
import * as nano from 'nano';
import { CulturaDto } from './dto/cultura.dto';
import { CulturaDocument, Cultura, Temperatura, Pluviometria } from './entities/cultura.entity';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { addDays, format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HttpStatusCode } from 'axios';
import * as moment from 'moment';
import { setTimeout } from 'timers/promises';
import { NotificacaoType } from 'src/types/types';

@Injectable()
export class CulturaService {
  private readonly repository: nano.DocumentScope<Cultura>;

  private models: { [key: string]: Model<any> };

  private readonly httpService = new HttpService();

  constructor(@InjectModel(Cultura.name) private culturaModel: Model<Cultura>) {
    this.models = {
      Cultura: culturaModel,
    };
  }

  async create(data: CulturaDto): Promise<CulturaDocument> {
    try {
      const clima = await this.getClima(data);

      data.temperaturas = clima.temperaturas || [];
      data.pluviometrias = clima.pluviometrias || [];
      data.alertasTemp = clima.alertasTemp || [];
      data.alertasPluvi = clima.alertasPluvi || [];
      data.lastUpdate = formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");
      data.createdAt = formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");

      const newCultura = await this.culturaModel.create({
        ponto_cultivo: data.ponto_cultivo,
        nome_cultivo: data.nome_cultivo,
        pluviometria_max: data.pluviometria_max,
        pluviometria_min: data.pluviometria_min,
        temperatura_max: data.temperatura_max,
        temperatura_min: data.temperatura_min,
        temperaturas: data.temperaturas,
        pluviometrias: data.pluviometrias,
        alertasPluvi: data.alertasPluvi,
        alertasTemp: data.alertasTemp,
        createdAt: data.createdAt,
        deletedAt: data.deletedAt,
        lastUpdate: data.lastUpdate,
        userId: data.userId,
      });

      return this.culturaModel.create(newCultura);
    } catch (error) {
      console.log('Erro ao obter dados climáticos:', error);

      data.temperaturas = [];
      data.pluviometrias = [];
      data.alertasTemp = [];
      data.alertasPluvi = [];

      const newCultura = await this.culturaModel.create({
        ponto_cultivo: data.ponto_cultivo,
        nome_cultivo: data.nome_cultivo,
        pluviometria_max: data.pluviometria_max,
        pluviometria_min: data.pluviometria_min,
        temperatura_max: data.temperatura_max,
        temperatura_min: data.temperatura_min,
        temperaturas: data.temperaturas,
        pluviometrias: data.pluviometrias,
        alertasPluvi: data.alertasPluvi,
        alertasTemp: data.alertasTemp,
        createdAt: data.createdAt,
        deletedAt: data.deletedAt,
        lastUpdate: data.lastUpdate,
        userId: data.userId,
      });

      return this.culturaModel.create(newCultura);
    }
  }

  private async getClima(cultura: CulturaDto, startDate?: string, endDate?: string) {
    const today = formatInTimeZone(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');

    const options = {
      method: 'GET',
      url: `https://meteostat.p.rapidapi.com/point/daily?lat=${cultura.ponto_cultivo.latitude}&lon=${cultura.ponto_cultivo.longitude}&start=${startDate ?? today}&end=${endDate ?? today}`,
      headers: {
        'X-RapidAPI-Key': process.env.METEOSTAT_API_KEY,
        'X-RapidAPI-Host': 'meteostat.p.rapidapi.com',
      },
    };

    try {
      const response = await firstValueFrom(this.httpService.get(options.url, { headers: options.headers }));
      const data = response.data;

      if (!data.data || data.data.length === 0) {
        return {
          temperaturas: [],
          pluviometrias: [],
          alertasTemp: [],
          alertasPluvi: [],
        };
      }

      const temperaturas = [];
      const pluviometrias = [];
      const alertasTemp = [];
      const alertasPluvi = [];

      data.data.map((dia: any) => {
        const temperatura: Temperatura = {
          data: dia.date,
          temperatura_max: dia.tmax,
          temperatura_media: dia.tavg,
          temperatura_min: dia.tmin,
        };
        const pluviometria: Pluviometria = { data: dia.date, pluviometria: dia.prcp };

        temperaturas.push(temperatura);
        pluviometrias.push(pluviometria);

        if (
          temperatura.temperatura_min < cultura.temperatura_min ||
          temperatura.temperatura_max > cultura.temperatura_max
        ) {
          alertasTemp.push(temperatura);
        }

        if (dia.prcp < cultura.pluviometria_min || dia.prcp > cultura.pluviometria_max) {
          alertasPluvi.push(pluviometria);
        }
      });

      return {
        temperaturas: temperaturas,
        pluviometrias: pluviometrias,
        alertasTemp: alertasTemp,
        alertasPluvi: alertasPluvi,
      };
    } catch (error) {
      console.log('Erro ao acessar a API do clima:', error);

      return {
        temperaturas: [],
        pluviometrias: [],
        alertasTemp: [],
        alertasPluvi: [],
      };
    }
  }

  async findAll(): Promise<CulturaDocument[]> {
    try {
      const culturas = await this.culturaModel.find().exec();

      const hoje = formatInTimeZone(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');

      for (let cultura of culturas) {
        if (cultura.deletedAt === '') {
          cultura = await this.UpdateTempAndPluvi(cultura, hoje);
        }
      }

      return culturas;
    } catch (error) {
      throw new Error(error);
    }
  }

  async findAllByUserId(userId: String): Promise<CulturaDocument[]> {
    try {
      const culturas = await this.culturaModel.find({ userId }).exec();

      const hoje = formatInTimeZone(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
      for (let cultura of culturas) {
        if (cultura.deletedAt === '') {
          cultura = await this.UpdateTempAndPluvi(cultura, hoje);
        }
      }

      return culturas;
    } catch (error) {
      throw new Error(error);
    }
  }

  async findOne(id: string): Promise<CulturaDocument> {
    try {
      const cultura = await this.culturaModel.findById(id).exec();

      const hoje = formatInTimeZone(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
      console.log('hoje :' + hoje);
      await this.UpdateTempAndPluvi(cultura, hoje);

      const updatedCultura = await this.culturaModel.findById(id).exec();

      return updatedCultura;
    } catch (error) {
      throw new Error(error);
    }
  }

  async remove(id: String): Promise<HttpStatusCode> {
    try {
      const cultura = await this.culturaModel.findById(id).exec();
      cultura.deletedAt = formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");
      cultura.temperaturas = [];
      cultura.pluviometrias = [];
      cultura.alertasPluvi = [];
      cultura.alertasTemp = [];

      await cultura.save();

      return HttpStatusCode.Ok;
    } catch (error) {
      return HttpStatusCode.NotFound;
    }
  }

  async update(id: string, data: CulturaDto): Promise<CulturaDocument> {
    return this.culturaModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  // async push(changes) {
  //   const { created, deleted, updated } = changes.Cultura;

  //   console.log('Deletados: ' + deleted);
  //   for (const [name, model] of Object.entries(this.models)) {
  //     changes[name].created.forEach(async (doc) => {
  //       const ponto_cultivo = JSON.parse(doc.ponto_cultivo);

  //       const data: CulturaDto = {
  //         id: doc.id,
  //         userId: doc.userId,
  //         ponto_cultivo: { latitude: ponto_cultivo.latitude, longitude: ponto_cultivo.longitude },
  //         nome_cultivo: doc.nome_cultivo,
  //         temperatura_max: doc.temperatura_max,
  //         temperatura_min: doc.temperatura_min,
  //         pluviometria_max: doc.pluviometria_max,
  //         pluviometria_min: doc.pluviometria_min,
  //         alertasPluvi: [],
  //         alertasTemp: [],
  //         pluviometrias: [],
  //         temperaturas: [],
  //         createdAt: doc.createdAt,
  //         deletedAt: doc.deletedAt,
  //         lastUpdate: doc.lastUpdate,
  //       };
  //       await this.create(data);
  //     });

  //     changes[name].updated.forEach(async (doc) => {
  //       const ponto_cultivo = JSON.parse(doc.ponto_cultivo);
  //       const temperaturas = JSON.parse(doc.temperaturas);
  //       const pluviometrias = JSON.parse(doc.pluviometrias);
  //       const alertasPluvi = JSON.parse(doc.alertasPluvi);
  //       const alertasTemp = JSON.parse(doc.alertasTemp);

  //       const data: CulturaDto = {
  //         id: doc.id,
  //         userId: doc.userId,
  //         ponto_cultivo: ponto_cultivo,
  //         nome_cultivo: doc.nome_cultivo,
  //         temperatura_max: doc.temperatura_max,
  //         temperatura_min: doc.temperatura_min,
  //         pluviometria_max: doc.pluviometria_max,
  //         pluviometria_min: doc.pluviometria_min,
  //         alertasPluvi: alertasPluvi,
  //         alertasTemp: alertasTemp,
  //         pluviometrias: pluviometrias,
  //         temperaturas: temperaturas,
  //         createdAt: doc.createdAt,
  //         deletedAt: doc.deletedAt,
  //         lastUpdate: doc.lastUpdate,
  //       };

  //       await this.update(doc._id, data);
  //     });

  //     changes[name].deleted.forEach(async (id) => {
  //       await this.remove(id);
  //     });
  //   }
  //   return HttpStatusCode.NoContent;
  // }

  // async pull(userId: string, last_pulled_at?: number) {
  //   const timestamp = moment().unix();
  //   const changes = {};

  //   await this.findAll();

  //   if (!last_pulled_at) {
  //     for (const [name, model] of Object.entries(this.models)) {
  //       changes[name] = {
  //         created: await this.findAllByUserId(userId),
  //         updated: [],
  //         deleted: [],
  //       };
  //     }
  //   } else {
  //     const lastPulledAtDate = moment.unix(last_pulled_at);

  //     // console.log("Moment: " + lastPulledAtDate)
  //     // console.log(`Date: ${lastPulledAtDate.toDate().toISOString()}`)
  //     // const timezone = formatInTimeZone(lastPulledAtDate.toDate(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX")
  //     // console.log(`timezone: ${timezone}`);
  //     // console.log(`ISO: ${parseISO(timezone).toISOString()}`)

  //     for (const [name, model] of Object.entries(this.models)) {
  //       changes[name] = {
  //         created: await this.getCreatedCultura(lastPulledAtDate.toDate(), userId),
  //         updated: await this.getUpdatedCultura(lastPulledAtDate.toDate(), userId),
  //         deleted: await this.getDeletedCulturas(lastPulledAtDate.toDate(), userId),
  //       };
  //     }
  //   }

  //   return { changes, timestamp };
  // }

  // async getCreatedCultura(last_pulled_at: Date, userId: string) {
  //   const formatDate = formatInTimeZone(last_pulled_at, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");
  //   const parsedDate = parseISO(formatDate).toISOString();
  //   const hoje = formatInTimeZone(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');

  //   console.log(parsedDate);

  //   const culturas = await this.culturaModel.find({ createdAt: { $gt: `${formatDate}` }, userId: userId }).exec();

  //   for (let cultura of culturas) {
  //     if (cultura.deletedAt == '') {
  //       cultura = await this.UpdateTempAndPluvi(cultura, hoje);
  //     }
  //   }

  //   const culturas2 = await this.culturaModel
  //     .find({ createdAt: { $gt: `${formatDate}` }, userId: userId })
  //     .lean()
  //     .exec();

  //   const result = culturas2
  //     .filter((doc) => !doc.deletedAt || doc.deletedAt === '')
  //     .map((doc) => ({
  //       _id: doc._id,
  //       nome_cultivo: doc.nome_cultivo,
  //       ponto_cultivo: JSON.stringify(doc.ponto_cultivo),
  //       temperatura_max: doc.temperatura_max,
  //       temperatura_min: doc.temperatura_min,
  //       pluviometria_max: doc.pluviometria_max,
  //       pluviometria_min: doc.pluviometria_min,
  //       temperaturas: JSON.stringify(doc.temperaturas),
  //       pluviometrias: JSON.stringify(doc.pluviometrias),
  //       alertasPluvi: JSON.stringify(doc.alertasPluvi),
  //       alertasTemp: JSON.stringify(doc.alertasTemp),
  //       lastUpdate: doc.lastUpdate,
  //       createdAt: doc.createdAt,
  //       deletedAt: '',
  //       id: doc.id,
  //     }));
  //   return result;
  // }

  // async getAllCreatedCultura() {
  //   const culturas = await this.culturaModel.find().exec();
  //   const hoje = formatInTimeZone(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');

  //   for (let cultura of culturas) {
  //     if (cultura.deletedAt == '') {
  //       cultura = await this.UpdateTempAndPluvi(cultura, hoje);
  //     }
  //   }

  //   const culturas2 = await this.culturaModel.find().lean().exec();

  //   const result = culturas2
  //     .filter((doc) => !doc.deletedAt || doc.deletedAt === '')
  //     .map((doc) => ({
  //       _id: doc._id,
  //       nome_cultivo: doc.nome_cultivo,
  //       ponto_cultivo: JSON.stringify(doc.ponto_cultivo),
  //       temperatura_max: doc.temperatura_max,
  //       temperatura_min: doc.temperatura_min,
  //       pluviometria_max: doc.pluviometria_max,
  //       pluviometria_min: doc.pluviometria_min,
  //       temperaturas: JSON.stringify(doc.temperaturas),
  //       pluviometrias: JSON.stringify(doc.pluviometrias),
  //       alertasPluvi: JSON.stringify(doc.alertasPluvi),
  //       alertasTemp: JSON.stringify(doc.alertasTemp),
  //       lastUpdate: doc.lastUpdate,
  //       createdAt: doc.createdAt,
  //       deletedAt: '',
  //       id: doc.id,
  //     }));

  //   return result;
  // }

  // async getUpdatedCultura(last_pulled_at: Date, userId: string) {
  //   const formatDate = formatInTimeZone(last_pulled_at, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");
  //   const parsedDate = parseISO(formatDate).toISOString();

  //   const hoje = formatInTimeZone(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');

  //   const culturas = await this.culturaModel
  //     .find({ createdAt: { $lte: `${formatDate}` }, lastUpdate: { $gt: `${formatDate}` }, userId: userId })
  //     .exec();

  //   for (let cultura of culturas) {
  //     if (cultura.deletedAt == '') {
  //       cultura = await this.UpdateTempAndPluvi(cultura, hoje);
  //     }
  //   }

  //   // console.log("Data: " + formatDate)

  //   const culturas2 = await this.culturaModel
  //     .find({ createdAt: { $lte: `${formatDate}` }, lastUpdate: { $gt: `${formatDate}` }, userId: userId })
  //     .lean()
  //     .exec();

  //   // console.log(`Cultura 2: ${culturas2}`)

  //   const response = culturas2
  //     .filter((doc) => !doc.deletedAt || doc.deletedAt === '')
  //     .map((doc) => ({
  //       nome_cultivo: doc.nome_cultivo,
  //       ponto_cultivo: JSON.stringify(doc.ponto_cultivo),
  //       temperatura_max: doc.temperatura_max,
  //       temperatura_min: doc.temperatura_min,
  //       pluviometria_max: doc.pluviometria_max,
  //       pluviometria_min: doc.pluviometria_min,
  //       temperaturas: JSON.stringify(doc.temperaturas),
  //       pluviometrias: JSON.stringify(doc.pluviometrias),
  //       alertasPluvi: JSON.stringify(doc.alertasPluvi),
  //       alertasTemp: JSON.stringify(doc.alertasTemp),
  //       lastUpdate: doc.lastUpdate,
  //       createdAt: doc.createdAt,
  //       deletedAt: '',
  //       id: doc.id,
  //       _id: doc._id,
  //     }));

  //   return response;
  // }

  // async getDeletedCulturas(last_pulled_at: Date, userId: string): Promise<String[]> {
  //   const formatDate = formatInTimeZone(last_pulled_at, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");
  //   const parsedDate = parseISO(formatDate).toISOString();

  //   return await this.culturaModel
  //     .find({
  //       deletedAt: { $gt: `${parsedDate}` },
  //       createdAt: { $lte: `${parsedDate}` },
  //       userId: userId,
  //     })
  //     .select('_id')
  //     .lean()
  //     .exec()
  //     .then((results) => results.map((doc) => doc.id));
  // }

  async UpdateTempAndPluvi(cultura: CulturaDocument, hoje: string) {
    setTimeout(500);

    const ultimaAtualizacao = cultura.lastUpdate ? format(new Date(cultura.lastUpdate), 'yyyy-MM-dd') : null;

    if (!ultimaAtualizacao || ultimaAtualizacao !== hoje) {
      const startDate = ultimaAtualizacao ? format(addDays(parseISO(ultimaAtualizacao), 1), 'yyyy-MM-dd') : hoje;

      const novosDados = await this.getClima(cultura, startDate, hoje);

      novosDados.temperaturas.forEach((novaTemp) => {
        const existe = cultura.temperaturas.some((temp) => temp.data === novaTemp.data || novaTemp.data < temp.data);
        if (!existe) {
          cultura.temperaturas.push(novaTemp);
        }
      });

      novosDados.pluviometrias.forEach((novaPluv) => {
        const existe = cultura.pluviometrias.some((pluv) => pluv.data === novaPluv.data || novaPluv.data < pluv.data);
        if (!existe) {
          cultura.pluviometrias.push(novaPluv);
        }
      });

      novosDados.alertasPluvi.forEach((novoAlerta) => {
        const existe = cultura.alertasPluvi.some(
          (pluv) => pluv.data === novoAlerta.data || novoAlerta.data < pluv.data,
        );

        if (!existe) {
          cultura.alertasPluvi.push(novoAlerta);
        }
      });

      novosDados.alertasTemp.forEach((novoAlerta) => {
        const existe = cultura.alertasTemp.some((temp) => temp.data === novoAlerta.data || novoAlerta.data < temp.data);
        if (!existe) {
          cultura.alertasTemp.push(novoAlerta);
        }
      });

      cultura.lastUpdate = formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");

      await this.culturaModel.updateOne({ _id: cultura._id }, { $set: cultura });

      return cultura;
    }
  }

  async getAlertasDoDia(userId: string) {
    const notificacoes: NotificacaoType[] = [];
    const data = new Date();
    data.setDate(data.getDate() - 1);

    const ontem = formatInTimeZone(data, 'America/Sao_Paulo', 'yyyy-MM-dd');

    try {
      const culturas = await this.culturaModel.find({ userId });

      for (const cultura of culturas) {
        let descTemp = '';
        let descPluvi = '';

        if (cultura.alertasPluvi.length !== 0) {
          const alertaPluviometria = cultura.alertasPluvi.at(-1);

          if (alertaPluviometria?.get('data') === ontem) {
            if (cultura.pluviometria_max < alertaPluviometria.get('pluviometria')) {
              descPluvi = `A pluviometria excedeu a máxima de ${cultura.pluviometria_max}mm.`;
            }

            if (cultura.pluviometria_min > alertaPluviometria.get('pluviometria')) {
              descPluvi = `A pluviometria ficou abaixo do limite mínimo de ${cultura.pluviometria_min}mm.`;
            }
          }
        }

        if (cultura.alertasTemp.length !== 0) {
          const alertaTemperatura = cultura.alertasTemp.at(-1);

          if (alertaTemperatura?.get('data') === ontem) {
            if (cultura.temperatura_max < alertaTemperatura.get('temperatura_max')) {
              descTemp = `A temperatura excedeu a máxima de ${cultura.temperatura_max}°C.`;
            }

            if (cultura.temperatura_min > alertaTemperatura.get('temperatura_min')) {
              descTemp = `A temperatura ficou abaixo do limite mínimo de ${cultura.temperatura_min}°C.`;
            }
          }
        }

        if (descPluvi || descTemp) {
          notificacoes.push({
            nome_cultivo: cultura.nome_cultivo,
            descPluviometria: descPluvi,
            descTemperatura: descTemp,
          });
        }
      }

      return notificacoes;
    } catch (error) {}
  }
}
