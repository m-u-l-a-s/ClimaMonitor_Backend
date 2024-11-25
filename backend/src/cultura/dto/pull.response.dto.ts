import { Pluviometria, Temperatura } from "../entities/cultura.entity";

export type PullResponseCultura = {
    id: number
    id_cultura: string
    latitude: string;
    longitude: string;
    nome_cultivo: string;
    temperatura_max: number;
    pluviometria_max: number;
    temperatura_min: number;
    pluviometria_min: number;
    last_update_mongo: string;
    created_at_mongo: string;
    deleted_at_mongo: string;
    user_id: string;
}

export type PullResponseTemperatura = {
    id: number
    id_cultura: string
    data: string
    temperatura_media: number;
    temperatura_max: number;
    temperatura_min: number;
}

export type PullResponsePluviometria = {
    id: number
    id_cultura: string
    data: string;
    pluviometria: number;
}

export type PullResponseAlertasTemp = {
    id: number
    id_cultura: string
    data: string
    temperatura_media: number;
    temperatura_max: number;
    temperatura_min: number;
}

export type PullResponseAlertasPluvi = {
    id: number
    id_cultura: string
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
  