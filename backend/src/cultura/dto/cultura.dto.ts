import { IsString, Length, IsNumber, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CulturaDto {
  @ApiProperty({
    description: 'Localização do ponto de cultivo',
    example: { latitude: '-23.5505', longitude: '-46.6333' },
  })
  ponto_cultivo: Localização;

  @ApiProperty({
    description: 'Nome da cultura (entre 4 e 30 caracteres)',
    example: 'Milho',
  })
  @IsString()
  @Length(4, 30, {
    message: 'Culture Name must be between 4 and 30 characters long',
  })
  nome_cultivo: string;

  @ApiProperty({
    description: 'Temperatura máxima suportada pela cultura',
    example: 35,
  })
  @IsNumber()
  temperatura_max: number;

  @ApiProperty({
    description: 'Pluviometria máxima suportada pela cultura (mm)',
    example: 100,
  })
  @IsNumber()
  pluviometria_max: number;

  @ApiProperty({
    description: 'Temperatura mínima suportada pela cultura',
    example: 15,
  })
  @IsNumber()
  temperatura_min: number;

  @ApiProperty({
    description: 'Pluviometria mínima suportada pela cultura (mm)',
    example: 30,
  })
  @IsNumber()
  pluviometria_min: number;

  @ApiProperty({
    description: 'Histórico de temperaturas registradas',
    type: [Object],
    example: [
      { data: '2024-01-01', temperatura: 22 },
      { data: '2024-01-02', temperatura: 24 },
    ],
  })
  @IsArray()
  temperaturas: Temperatura[];

  @ApiProperty({
    description: 'Histórico de pluviometrias registradas (mm)',
    type: [Object],
    example: [
      { data: '2024-01-01', pluviometria: 80 },
      { data: '2024-01-02', pluviometria: 70 },
    ],
  })
  @IsArray()
  pluviometrias: Pluviometria[];

  @ApiProperty({
    description: 'Alertas de temperatura para datas específicas',
    type: [Object],
    example: [{ '2024-01-01': 1 }, { '2024-01-02': 0 }],
  })
  @IsArray()
  alertasTemp: Alerta[];

  @ApiProperty({
    description: 'Alertas de pluviometria para datas específicas',
    type: [Object],
    example: [{ '2024-01-01': 1 }, { '2024-01-02': 0 }],
  })
  @IsArray()
  alertasPluvi: Alerta[];
}

export type Temperatura = {
  data: Date;
  temperatura: number;
};

export type Pluviometria = {
  data: Date;
  pluviometria: number;
};

export type Localização = {
  latitude: string;
  longitude: string;
};

export type Alerta = {
  [date: string]: number;
};
