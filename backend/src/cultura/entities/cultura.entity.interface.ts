import * as nano from "nano"
import { Localização, Temperatura, Pluviometria, Alerta } from "../dto/cultura.dto";

export interface iCultura extends nano.MaybeDocument {
    ponto_cultivo : Localização;
    nome_cultivo : string;
    temperatura_max : number;
    pluviometria_max : number;
    temperatura_min : number;
    pluviometria_min : number;
    temperaturas : Temperatura[];
    pluviometrias : Pluviometria[];

    alertasTemp : Alerta[];
    alertasPluvi : Alerta[];
}