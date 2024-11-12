import { Pluviometria, Temperatura } from "../entities/cultura.entity";

export type PullResponseCultura = {
    latitude: string;
    longitude: string;
    nome_cultivo: string;
    temperatura_max: number;
    pluviometria_max: number;
    temperatura_min: number;
    pluviometria_min: number;
    lastUpdate: string;
    createdAt: string;
    deletedAt?: string;
    id: string;
    userId: string;
}

export type PullResponseTemperatura = {
    idCultura: string
    data: string
    temperatura_media: number;
    temperatura_max: number;
    temperatura_min: number;
}

export type PullResponsePluviometria = {
    idCultura: string
    data: string;
    pluviometria: number;
}

export type PullResponseAlertasTemp = {
    idCultura: string
    data: string
    temperatura_media: number;
    temperatura_max: number;
    temperatura_min: number;
}

export type PullResponseAlertasPluvi = {
    idCultura: string
    data: string;
    pluviometria: number;
}

export type CulturaTemperaturas = {
    id: string;
    temperaturas: Temperatura[];
};

export type CulturaAlertasTemperaturas = {
    id: string;
    alertaTemperaturas: Temperatura[];
};

export type CulturaPluviometrias = {
    id: string;
    pluviometrias: Pluviometria[];
};

export type alertasPluviCulturaPluviometrias = {
    id: string;
    pluviometrias: Pluviometria[];
};
  