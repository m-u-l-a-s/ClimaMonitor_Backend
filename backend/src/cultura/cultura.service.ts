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
import { CulturaTemperaturas, PullResponseAlertasPluvi, PullResponseAlertasTemp, PullResponseCultura, PullResponsePluviometria, PullResponseTemperatura } from './dto/pull.response.dto';

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

  async findAllByUserId(userId: String) {
    try {
      const culturas = await this.culturaModel.find({ userId: userId, deletedAt: "" })
        .exec();

      const hoje = formatInTimeZone(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
      for (let cultura of culturas) {
        if (cultura.deletedAt === '') {
          cultura = await this.UpdateTempAndPluvi(cultura, hoje);
        }
      }

      const responseCulturaCreated: PullResponseCultura[] = culturas
        .filter((doc) => !doc.deletedAt || doc.deletedAt === '')
        .map((doc) => ({
          nome_cultivo: doc.nome_cultivo,
          latitude: doc.ponto_cultivo.latitude,
          longitude: doc.ponto_cultivo.longitude,
          temperatura_max: doc.temperatura_max,
          temperatura_min: doc.temperatura_min,
          pluviometria_max: doc.pluviometria_max,
          pluviometria_min: doc.pluviometria_min,
          lastUpdate: doc.lastUpdate,
          createdAt: doc.createdAt,
          deletedAt: '',
          userId: doc.userId,
          id: doc.id,
        }));

      const responseTemperaturasCreated: PullResponseTemperatura[] = []
      const responseAlertaTempCreated: PullResponseAlertasTemp[] = []
      const responsePluviometriaCreated: PullResponsePluviometria[] = []
      const responseAlertaPluviCreated: PullResponseAlertasPluvi[] = []


      for (let cultura of culturas) {
        for (let temperatura of cultura.temperaturas) {
          responseTemperaturasCreated.push({
            idCultura: cultura.id,
            data: temperatura.data,
            temperatura_max: temperatura.temperatura_max,
            temperatura_media: temperatura.temperatura_media,
            temperatura_min: temperatura.temperatura_min
          })
        }

        for (let alertaTemp of cultura.alertasTemp) {
          responseAlertaTempCreated.push({
            idCultura: cultura.id,
            data: alertaTemp.data,
            temperatura_max: alertaTemp.temperatura_max,
            temperatura_media: alertaTemp.temperatura_media,
            temperatura_min: alertaTemp.temperatura_min
          })
        }

        for (let pluviometria of cultura.pluviometrias) {
          responsePluviometriaCreated.push({
            idCultura: cultura.id,
            data: pluviometria.data,
            pluviometria: pluviometria.pluviometria
          })
        }

        for (let alertaPluvi of cultura.alertasPluvi) {
          responseAlertaPluviCreated.push({
            idCultura: cultura.id,
            data: alertaPluvi.data,
            pluviometria: alertaPluvi.pluviometria
          })
        }
      }

      return {
        responseCulturaCreated,
        responseAlertaTempCreated,
        responseAlertaPluviCreated,
        responseTemperaturasCreated,
        responsePluviometriaCreated
      };

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

  async push(changes) {
    const { created, deleted, updated } = changes.Cultura;

    console.log('Deletados: ' + deleted);
    for (const [name, model] of Object.entries(this.models)) {
      changes[name].created.forEach(async (doc) => {
        const ponto_cultivo = JSON.parse(doc.ponto_cultivo);

        const data: CulturaDto = {
          id: doc.id,
          userId: doc.userId,
          ponto_cultivo: { latitude: ponto_cultivo.latitude, longitude: ponto_cultivo.longitude },
          nome_cultivo: doc.nome_cultivo,
          temperatura_max: doc.temperatura_max,
          temperatura_min: doc.temperatura_min,
          pluviometria_max: doc.pluviometria_max,
          pluviometria_min: doc.pluviometria_min,
          alertasPluvi: [],
          alertasTemp: [],
          pluviometrias: [],
          temperaturas: [],
          createdAt: doc.createdAt,
          deletedAt: doc.deletedAt,
          lastUpdate: doc.lastUpdate,
        };
        await this.create(data);
      });

      changes[name].updated.forEach(async (doc) => {
        const ponto_cultivo = JSON.parse(doc.ponto_cultivo);
        const temperaturas = JSON.parse(doc.temperaturas);
        const pluviometrias = JSON.parse(doc.pluviometrias);
        const alertasPluvi = JSON.parse(doc.alertasPluvi);
        const alertasTemp = JSON.parse(doc.alertasTemp);

        const data: CulturaDto = {
          id: doc.id,
          userId: doc.userId,
          ponto_cultivo: ponto_cultivo,
          nome_cultivo: doc.nome_cultivo,
          temperatura_max: doc.temperatura_max,
          temperatura_min: doc.temperatura_min,
          pluviometria_max: doc.pluviometria_max,
          pluviometria_min: doc.pluviometria_min,
          alertasPluvi: alertasPluvi,
          alertasTemp: alertasTemp,
          pluviometrias: pluviometrias,
          temperaturas: temperaturas,
          createdAt: doc.createdAt,
          deletedAt: doc.deletedAt,
          lastUpdate: doc.lastUpdate,
        };

        await this.update(doc._id, data);
      });

      changes[name].deleted.forEach(async (id) => {
        await this.remove(id);
      });
    }
    return HttpStatusCode.NoContent;
  }

  async pull(userId: string, last_pulled_at?: number) {
    const timestamp = moment().unix();
    const changes = {};


    if (!last_pulled_at) {
      const {
        responseCulturaCreated,
        responseAlertaTempCreated,
        responseAlertaPluviCreated,
        responseTemperaturasCreated,
        responsePluviometriaCreated
      } = await this.findAllByUserId(userId);

      changes["Cultura"] = {
        created: responseCulturaCreated,
        updated: [],
        deleted: [],
      };

      changes["Temperaturas"] = {
        created: responseTemperaturasCreated,
        updated: [],
        deleted: []
      };

      changes["Pluviometria"] = {
        created: responsePluviometriaCreated,
        updated: [],
        deleted: []
      };

      changes["AlertasTemperatura"] = {
        created: responseAlertaTempCreated,
        updated: [],
        deleted: []
      };

      changes["AlertasPluviometria"] = {
        created: responseAlertaPluviCreated,
        updated: [],
        deleted: []
      };

    } else {
      const lastPulledAtDate = moment.unix(last_pulled_at);

      const { responseCulturaCreated,
        responseAlertaTempCreated,
        responseAlertaPluviCreated,
        responseTemperaturasCreated,
        responsePluviometriaCreated } = await this.getCreatedCultura(lastPulledAtDate.toDate(), userId)

      const {
        responseCulturaUpdated,
        responseTemperaturasUpdated,
        responsePluviometriaUpdated,
        responseAlertaTempUpdated,
        responseAlertaPluviUpdated
      } = await this.getUpdatedCultura(lastPulledAtDate.toDate(), userId)

      const culturasDeletadas = await this.getDeletedCulturas(lastPulledAtDate.toDate(), userId)

      changes["Cultura"] = {
        created: responseCulturaCreated,
        updated: responseCulturaUpdated,
        deleted: culturasDeletadas
        ,
      };

      changes["Temperaturas"] = {
        created: responseTemperaturasCreated,
        updated: responseTemperaturasUpdated,
        deleted: culturasDeletadas
      };

      changes["Pluviometria"] = {
        created: responsePluviometriaCreated,
        updated: responsePluviometriaUpdated,
        deleted: culturasDeletadas
      };

      changes["AlertasTemperatura"] = {
        created: responseAlertaTempCreated,
        updated: responseAlertaTempUpdated,
        deleted: culturasDeletadas
      };

      changes["AlertasPluviometria"] = {
        created: responseAlertaPluviCreated,
        updated: responseAlertaPluviUpdated,
        deleted: culturasDeletadas
      };
    }

    return { changes, timestamp };
  }

  async getCreatedCultura(last_pulled_at: Date, userId: string) {
    const formatDate = formatInTimeZone(last_pulled_at, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");
    const parsedDate = parseISO(formatDate).toISOString();
    const hoje = formatInTimeZone(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');

    console.log(parsedDate);

    const culturas2 = await this.culturaModel
      .find({ createdAt: { $gt: `${formatDate}` }, userId: userId, deletedAt: "" })
      .lean()
      .exec();

    const responseCulturaCreated: PullResponseCultura[] = culturas2
      .filter((doc) => !doc.deletedAt || doc.deletedAt === '')
      .map((doc) => ({
        nome_cultivo: doc.nome_cultivo,
        latitude: doc.ponto_cultivo.latitude,
        longitude: doc.ponto_cultivo.longitude,
        temperatura_max: doc.temperatura_max,
        temperatura_min: doc.temperatura_min,
        pluviometria_max: doc.pluviometria_max,
        pluviometria_min: doc.pluviometria_min,
        lastUpdate: doc.lastUpdate,
        createdAt: doc.createdAt,
        deletedAt: '',
        userId: doc.userId,
        id: doc.id,
      }));

    const responseTemperaturasCreated: PullResponseTemperatura[] = []
    const responseAlertaTempCreated: PullResponseAlertasTemp[] = []
    const responsePluviometriaCreated: PullResponsePluviometria[] = []
    const responseAlertaPluviCreated: PullResponseAlertasPluvi[] = []


    for (let cultura of culturas2) {
      for (let temperatura of cultura.temperaturas) {
        responseTemperaturasCreated.push({
          idCultura: cultura.id,
          data: temperatura.data,
          temperatura_max: temperatura.temperatura_max,
          temperatura_media: temperatura.temperatura_media,
          temperatura_min: temperatura.temperatura_min
        })
      }

      for (let temperatura of cultura.alertasTemp) {
        responseAlertaTempCreated.push({
          idCultura: cultura.id,
          data: temperatura.data,
          temperatura_max: temperatura.temperatura_max,
          temperatura_media: temperatura.temperatura_media,
          temperatura_min: temperatura.temperatura_min
        })
      }

      for (let pluviometria of cultura.pluviometrias) {
        responsePluviometriaCreated.push({
          idCultura: cultura.id,
          data: pluviometria.data,
          pluviometria: pluviometria.pluviometria
        })
      }

      for (let pluviometria of cultura.alertasPluvi) {
        responseAlertaPluviCreated.push({
          idCultura: cultura.id,
          data: pluviometria.data,
          pluviometria: pluviometria.pluviometria
        })
      }
    }

    return { responseCulturaCreated, responseAlertaTempCreated, responseAlertaPluviCreated, responseTemperaturasCreated, responsePluviometriaCreated };
  }

  async getAllCreatedCultura() {
    const culturas = await this.culturaModel.find().exec();
    const hoje = formatInTimeZone(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');

    for (let cultura of culturas) {
      if (cultura.deletedAt == '') {
        cultura = await this.UpdateTempAndPluvi(cultura, hoje);
      }
    }

    const culturas2 = await this.culturaModel.find().lean().exec();

    const result = culturas2
      .filter((doc) => !doc.deletedAt || doc.deletedAt === '')
      .map((doc) => ({
        _id: doc._id,
        nome_cultivo: doc.nome_cultivo,
        ponto_cultivo: doc.ponto_cultivo,
        temperatura_max: doc.temperatura_max,
        temperatura_min: doc.temperatura_min,
        pluviometria_max: doc.pluviometria_max,
        pluviometria_min: doc.pluviometria_min,
        temperaturas: doc.temperaturas,
        pluviometrias: doc.pluviometrias,
        alertasPluvi: doc.alertasPluvi,
        alertasTemp: doc.alertasTemp,
        lastUpdate: doc.lastUpdate,
        createdAt: doc.createdAt,
        deletedAt: '',
        id: doc.id,
      }));

    return result;
  }

  async getUpdatedCultura(last_pulled_at: Date, userId: string) {
    const formatDate = formatInTimeZone(last_pulled_at, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");
    const parsedDate = parseISO(formatDate).toISOString();

    const hoje = formatInTimeZone(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');

    const culturas = await this.culturaModel
      .find({ createdAt: { $lte: `${formatDate}` }, lastUpdate: { $gt: `${formatDate}` }, userId: userId, deletedAt: "" })
      .exec();

    for (let cultura of culturas) {
      if (cultura.deletedAt == '') {
        cultura = await this.UpdateTempAndPluvi(cultura, hoje);
      }
    }

    const culturas2 = await this.culturaModel
      .find({ createdAt: { $lte: `${formatDate}` }, lastUpdate: { $gt: `${formatDate}` }, userId: userId, deletedAt: "" })
      .select("-temperaturas -pluviometrias -alertasTemp -alertasPluvi")
      .lean()
      .exec();


    const responseCulturaUpdated: PullResponseCultura[] = culturas2
      .filter((doc) => !doc.deletedAt || doc.deletedAt === '')
      .map((doc) => ({
        nome_cultivo: doc.nome_cultivo,
        latitude: doc.ponto_cultivo.latitude,
        longitude: doc.ponto_cultivo.longitude,
        temperatura_max: doc.temperatura_max,
        temperatura_min: doc.temperatura_min,
        pluviometria_max: doc.pluviometria_max,
        pluviometria_min: doc.pluviometria_min,
        lastUpdate: doc.lastUpdate,
        createdAt: doc.createdAt,
        deletedAt: '',
        userId: doc.userId,
        id: doc.id,
      }));

    const responseTemperaturasUpdated: PullResponseTemperatura[] = []
    const responseAlertaTempUpdated: PullResponseAlertasTemp[] = []
    const responsePluviometriaUpdated: PullResponsePluviometria[] = []
    const responseAlertaPluviUpdated: PullResponseAlertasPluvi[] = []


    for (let cultura of culturas2) {
      for (let temperatura of cultura.temperaturas) {
        responseTemperaturasUpdated.push({
          idCultura: cultura.id,
          data: temperatura.data,
          temperatura_max: temperatura.temperatura_max,
          temperatura_media: temperatura.temperatura_media,
          temperatura_min: temperatura.temperatura_min
        })
      }

      for (let temperatura of cultura.alertasTemp) {
        responseAlertaTempUpdated.push({
          idCultura: cultura.id,
          data: temperatura.data,
          temperatura_max: temperatura.temperatura_max,
          temperatura_media: temperatura.temperatura_media,
          temperatura_min: temperatura.temperatura_min
        })
      }

      for (let pluviometria of cultura.pluviometrias) {
        responsePluviometriaUpdated.push({
          idCultura: cultura.id,
          data: pluviometria.data,
          pluviometria: pluviometria.pluviometria
        })
      }

      for (let pluviometria of cultura.alertasPluvi) {
        responseAlertaPluviUpdated.push({
          idCultura: cultura.id,
          data: pluviometria.data,
          pluviometria: pluviometria.pluviometria
        })
      }
    }

    return {
      responseCulturaUpdated,
      responseTemperaturasUpdated,
      responsePluviometriaUpdated,
      responseAlertaTempUpdated,
      responseAlertaPluviUpdated
    };
  }

  async getDeletedCulturas(last_pulled_at: Date, userId: string): Promise<String[]> {
    const formatDate = formatInTimeZone(last_pulled_at, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");
    const parsedDate = parseISO(formatDate).toISOString();

    return await this.culturaModel
      .find({
        deletedAt: { $gt: `${parsedDate}` },
        createdAt: { $lte: `${parsedDate}` },
        userId: userId,
      })
      .select('_id')
      .lean()
      .exec()
      .then((results) => results.map((doc) => doc.id));
  }

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

  async getUpdatedTemperaturas(last_pulled_at: Date, userId: string) {
    const formatDate = formatInTimeZone(last_pulled_at, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");
    const parsedDate = parseISO(formatDate).toISOString();

    const hoje = formatInTimeZone(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');

    const temperaturas: CulturaTemperaturas[] = await this.culturaModel
      .find({ createdAt: { $lte: `${formatDate}` }, lastUpdate: { $gt: `${formatDate}` }, userId: userId, deletedAt: "" })
      .select("id temperaturas")
      .exec();

    let result: PullResponseTemperatura[]

    for (let temperatura of temperaturas) {
      temperatura.temperaturas.map(temp => (
        result.push({
          idCultura: temperatura.id,
          data: temp.data,
          temperatura_max: temp.temperatura_max,
          temperatura_media: temp.temperatura_media,
          temperatura_min: temp.temperatura_min
        })
      ))
    }
    return result;
  }


}
