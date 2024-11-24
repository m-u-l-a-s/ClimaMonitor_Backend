import { PullResponseAlertasPluvi, PullResponseAlertasTemp, PullResponseCultura, PullResponsePluviometria, PullResponseTemperatura } from "src/cultura/dto/pull.response.dto";

export type NotificacaoType = {
  nome_cultivo: string;
  descTemperatura: string;
  descPluviometria: string;
};

export type PushChangesType = {
  Cultura : PushCulturaChanges
  Temperatura : PushTemperatura
  Pluviometria: PushPluviometria
  AlertasTemperatura: PushAlertasTemperatura
  AlertasPluviometria: PushAlertasPluviometria
}

export type PushCulturaChanges = {
  created: PullResponseCultura[],
  updated: PullResponseCultura[],
  deleted: string[]
}

export type PushTemperatura = {
  created: PullResponseTemperatura[],
  updated: PullResponseTemperatura[],
  deleted: string[]
}

export type PushPluviometria = {
  created: PullResponsePluviometria[],
  updated: PullResponsePluviometria[],
  deleted: string[]
}

export type PushAlertasTemperatura = {
  created: PullResponseAlertasTemp[],
  updated: PullResponseAlertasTemp[],
  deleted: string[]
}

export type PushAlertasPluviometria = {
  created: PullResponseAlertasPluvi[],
  updated: PullResponseAlertasPluvi[],
  deleted: string[]
}