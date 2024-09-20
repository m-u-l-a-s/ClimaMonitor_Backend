import { IsString, Length, IsNumber, IsArray} from "class-validator";

export class CulturaDto {
    ponto_cultivo : Localização;

    @IsString()
    @Length(4,30, {
        message: "Culture Name must be between 4 and 30 characters long"
    })
    nome_cultivo : string;

    @IsNumber()
    temperatura_max : number;

    @IsNumber()
    pluviometria_max : number;

    @IsNumber()
    temperatura_min : number;

    @IsNumber()
    pluviometria_min : number;

    @IsArray()
    temperaturas : Temperatura[];

    @IsArray()
    pluviometrias : Pluviometria[];

    @IsArray()
    alertasTemp : Alerta[];

    @IsArray()
    alertasPluvi : Alerta[];
}


export type Temperatura = {
    data : Date,
    temperatura : number
}

export type Pluviometria = {
    data : Date,
    pluviometria : number
}

export type Localização = {
    latitude : string,
    longitude : string
}

export type Alerta = {
    [date: string] : number;
}