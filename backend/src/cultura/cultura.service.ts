import { ConflictException, Injectable } from '@nestjs/common';
import * as nano from 'nano';
import { CulturaDto } from './dto/cultura.dto';
import { CulturaDocument, Cultura, Temperatura, Pluviometria } from './entities/cultura.entity';
import { firstValueFrom, retry, timestamp } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { addDays, format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HttpStatusCode } from 'axios';
import * as moment from 'moment';

@Injectable()
export class CulturaService {
  private readonly repository: nano.DocumentScope<Cultura>;

  private models: { [key: string]: Model<any> };

  private readonly httpService = new HttpService();

  constructor(@InjectModel(Cultura.name) private culturaModel: Model<Cultura>) {
    this.models = {
      "Cultura": culturaModel
    }
  }

  async create(data: CulturaDto): Promise<CulturaDocument> {
    try {
      const clima = await this.getClima(data);

      data.temperaturas = clima.temperaturas;
      data.pluviometrias = clima.pluviometrias;
      data.alertasTemp = clima.alertasTemp;
      data.alertasPluvi = clima.alertasPluv;
      data.lastUpdate = formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");
      data.createdAt = formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");
      data.deletedAt = "";

      const culturaCreated = new this.culturaModel(data);

      return culturaCreated.save();
    } catch (error) {
      data.temperaturas = [];
      data.pluviometrias = [];
      const culturaCreated = new this.culturaModel(data);
      return culturaCreated.save();
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
        throw new ConflictException('Nenhum dado climático disponível para o intervalo fornecido');
      }

      const temperaturas = []
      const pluviometrias = []
      const alertasTemp = []
      const alertasPluv = []

      data.data.map((dia: any) => {
        const temperatura: Temperatura = { data: dia.date, temperatura_max: dia.tmax, temperatura_media: dia.tavg, temperatura_min: dia.tmin }
        const pluviometria: Pluviometria = { data: dia.date, pluviometria: dia.prcp }
        temperaturas.push(temperatura)
        pluviometrias.push(pluviometria)

        if (temperatura.temperatura_min < cultura.temperatura_min || temperatura.temperatura_max > cultura.temperatura_max) {
          alertasTemp.push(temperatura)
        }

        if (dia.prcp < cultura.pluviometria_min || dia.prcp > cultura.pluviometria_max) {
          alertasPluv.push(pluviometria)
        }
      })

      return { temperaturas: temperaturas, pluviometrias: pluviometrias, alertasTemp: alertasTemp, alertasPluv: alertasPluv };
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

      for (let cultura of culturas) {
        if (cultura.deletedAt == "") {
          cultura = await this.UpdateTempAndPluvi(cultura, hoje)
        }
      }
      return culturas;
    }
    catch (error) {
      throw new Error(error);
    }
  }

  // async findOne(id: string): Promise<CulturaDocument> {
  //   try {
  //     const cultura = await this.culturaModel.findById(id).exec();

  //     const hoje = formatInTimeZone(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
  //     console.log('hoje :' + hoje);
  //     await this.UpdateTempAndPluvi(cultura, hoje)

  //     const updatedCultura = await this.culturaModel.findById(id).exec();

  //     return updatedCultura
  //   } catch (error) {
  //     throw new Error(error);
  //   }
  // }

  async remove(id: string): Promise<HttpStatusCode> {
    try {
      const cultura = await this.culturaModel.findById({ _id: id }).exec();
      cultura.deletedAt = formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");
      cultura.temperaturas = []
      cultura.pluviometrias = []
      cultura.alertasPluvi = []
      cultura.alertasTemp = []
      await cultura.save()
      return HttpStatusCode.Ok
    } catch (error) {
      return HttpStatusCode.NotFound;
    }
  }

  async update(id: string, data: CulturaDto): Promise<CulturaDocument> {
    return this.culturaModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async pull(last_pulled_at?: number) {
    const timestamp = moment().unix();
    const changes = {}

    if (!last_pulled_at) {
      for (const [name, model] of Object.entries(this.models)) {
        changes[name] = {
          created: await this.getAllCreatedCultura(),
          updated: [],
          deleted: []
        };
      }
    } else {

      const lastPulledAtDate = moment.unix(last_pulled_at);

      console.log()

      for (const [name, model] of Object.entries(this.models)) {
        changes[name] = {
          created: await this.getCreatedCultura(lastPulledAtDate.toDate()),
          updated: await this.getUpdatedCultura(lastPulledAtDate.toDate()),
          deleted: await this.getDeletedCulturas(lastPulledAtDate.toDate())
        };
      }
    }

    return { changes, timestamp }
  }

  async getCreatedCultura(last_pulled_at: Date) {
    const formatDate = formatInTimeZone(last_pulled_at, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX")
    const parsedDate = parseISO(formatDate).toISOString();

    console.log(parsedDate)

    const culturas = await this.culturaModel.find({ createdAt: { $gt: `${parsedDate}` } }).lean().exec()

    const result = culturas.filter(doc => !doc.deletedAt || doc.deletedAt === "")
      .map(doc => ({
        _id: doc._id,
        nome_cultivo: doc.nome_cultivo,
        ponto_cultivo: JSON.stringify(doc.ponto_cultivo),
        temperatura_max: doc.temperatura_max,
        temperatura_min: doc.temperatura_min,
        pluviometria_max: doc.pluviometria_max,
        pluviometria_min: doc.pluviometria_min,
        temperaturas: JSON.stringify(doc.temperaturas),
        pluviometrias: JSON.stringify(doc.pluviometrias),
        alertasPluvi: JSON.stringify(doc.alertasPluvi),
        alertasTemp: JSON.stringify(doc.alertasTemp),
        lastUpdate: doc.lastUpdate,
        createdAt: doc.createdAt,
        deletedAt: "",
        id: doc.id
      }))
    return result
  }

  async getAllCreatedCultura() {
    const culturas = await this.culturaModel.find().lean().exec();

    const result = culturas
      .filter(doc => !doc.deletedAt || doc.deletedAt === "")
      .map(doc => ({
        _id: doc._id,
        nome_cultivo: doc.nome_cultivo,
        ponto_cultivo: JSON.stringify(doc.ponto_cultivo),
        temperatura_max: doc.temperatura_max,
        temperatura_min: doc.temperatura_min,
        pluviometria_max: doc.pluviometria_max,
        pluviometria_min: doc.pluviometria_min,
        temperaturas: JSON.stringify(doc.temperaturas),
        pluviometrias: JSON.stringify(doc.pluviometrias),
        alertasPluvi: JSON.stringify(doc.alertasPluvi),
        alertasTemp: JSON.stringify(doc.alertasTemp),
        lastUpdate: doc.lastUpdate,
        createdAt: doc.createdAt,
        deletedAt: "",
        id: doc.id
      }));

    return result;
  }

  async getUpdatedCultura(last_pulled_at: Date) {
    const formatDate = formatInTimeZone(last_pulled_at, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX")

    const parsedDate = parseISO(formatDate);

    const culturas = await this.culturaModel.find({ createdAt: { $lt: `${parsedDate}` }, lastUpdate: { $gt: `${parsedDate}` } }).lean().exec()

    const response = culturas
      .filter(doc => !doc.deletedAt || doc.deletedAt === "")
      .map(doc => ({
        _id: doc._id,
        nome_cultivo: doc.nome_cultivo,
        ponto_cultivo: JSON.stringify(doc.ponto_cultivo),
        temperatura_max: doc.temperatura_max,
        temperatura_min: doc.temperatura_min,
        pluviometria_max: doc.pluviometria_max,
        pluviometria_min: doc.pluviometria_min,
        temperaturas: JSON.stringify(doc.temperaturas),
        pluviometrias: JSON.stringify(doc.pluviometrias),
        alertasPluvi: JSON.stringify(doc.alertasPluvi),
        alertasTemp: JSON.stringify(doc.alertasTemp),
        lastUpdate: doc.lastUpdate,
        createdAt: doc.createdAt,
        deletedAt: "",
        id: doc.id
      }));

      return response;
  }

  async getDeletedCulturas(last_pulled_at: Date): Promise<String[]> {
    const formatDate = formatInTimeZone(last_pulled_at, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX")
    const parsedDate = parseISO(formatDate).toISOString();

    return await this.culturaModel.find({
      deletedAt: { $gt: `${parsedDate}` },
      createdAt: { $lte: `${parsedDate}` },
    })
      .select('_id')
      .lean()
      .exec()
      .then(results => results.map(doc => doc.nome_cultivo));
  }

  async UpdateTempAndPluvi(cultura: CulturaDocument, hoje: string) {
    console.log('cultura.lastUpdate :' + cultura.lastUpdate);

    const ultimaAtualizacao = cultura.lastUpdate ? format(new Date(cultura.lastUpdate), 'yyyy-MM-dd') : null;
    console.log('ultimaAtualizacao :' + ultimaAtualizacao);

    if (!ultimaAtualizacao || ultimaAtualizacao !== hoje) {
      const startDate = ultimaAtualizacao ? format(addDays(parseISO(ultimaAtualizacao), 1), 'yyyy-MM-dd') : hoje;
      console.log('startDate :' + startDate);

      const novosDados = await this.getClima(
        cultura,
        startDate,
        hoje
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

      novosDados.alertasPluv.forEach((novoAlerta) => {
        const existe = cultura.alertasPluvi.some(
          pluv => pluv.data === novoAlerta.data || novoAlerta.data < pluv.data,
        );

        if (!existe) {
          cultura.alertasPluvi.push(novoAlerta)
        }
      })

      novosDados.alertasTemp.forEach((novoAlerta) => {
        const existe = cultura.alertasTemp.some(
          temp => temp.data === novoAlerta.data || novoAlerta.data < temp.data,
        );
        if (!existe) {
          cultura.alertasTemp.push(novoAlerta)
        }
      });

      cultura.lastUpdate = formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");

      await this.culturaModel.updateOne({ _id: cultura._id }, { $set: cultura });

      return cultura
    }
  }
}
