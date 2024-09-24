import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { CulturaService } from './cultura.service';
import { CulturaDto } from './dto/cultura.dto';
import { CulturaEntity } from './entities/cultura.entity';
import { ApiOperation, ApiResponse, ApiTags, ApiParam, ApiBody } from '@nestjs/swagger';
import * as nano from 'nano';

@ApiTags('Cultura') // Tag para agrupar endpoints no Swagger
@Controller('cultura')
export class CulturaController {
  constructor(private readonly culturaService: CulturaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria uma nova cultura' }) // Descrição do endpoint
  @ApiResponse({ status: 201, description: 'Cultura criada com sucesso.', type: CulturaEntity }) // Resposta esperada
  @ApiResponse({ status: 400, description: 'Dados inválidos.' }) // Possíveis erros
  @ApiBody({ type: CulturaDto, description: 'Dados da nova cultura' }) // Documenta o corpo da requisição
  create(@Body() dto: CulturaDto): Promise<CulturaEntity> {
    return this.culturaService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lista todas as culturas' }) // Descrição do endpoint
  @ApiResponse({ status: 200, description: 'Culturas retornadas com sucesso.', type: [CulturaEntity] }) // Resposta esperada
  findAll(): Promise<CulturaEntity[]> {
    return this.culturaService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retorna uma cultura específica por ID' }) // Descrição do endpoint
  @ApiParam({ name: 'id', description: 'ID da cultura', type: String }) // Documenta o parâmetro 'id'
  @ApiResponse({ status: 200, description: 'Cultura retornada com sucesso.', type: CulturaEntity }) // Resposta esperada
  @ApiResponse({ status: 404, description: 'Cultura não encontrada.' }) // Possíveis erros
  findOne(@Param('id') id: string): Promise<CulturaEntity> {
    return this.culturaService.findOne(id);
  }

  @Put(':id/:rev')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualiza uma cultura existente' }) // Descrição do endpoint
  @ApiParam({ name: 'id', description: 'ID da cultura', type: String }) // Documenta o parâmetro 'id'
  @ApiParam({ name: 'rev', description: 'Revisão do documento para controle de versionamento', type: String }) // Documenta o parâmetro 'rev'
  @ApiBody({ type: CulturaDto, description: 'Dados atualizados da cultura' }) // Documenta o corpo da requisição
  @ApiResponse({ status: 200, description: 'Cultura atualizada com sucesso.' }) // Resposta esperada
  @ApiResponse({ status: 404, description: 'Cultura não encontrada.' }) // Possíveis erros
  update(
    @Param('id') id: string,
    @Param('rev') rev: string,
    @Body() dto: CulturaDto,
  ): Promise<nano.DocumentInsertResponse> {
    return this.culturaService.update(id, rev, dto);
  }

  @Delete(':id/:rev')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove uma cultura existente' }) // Descrição do endpoint
  @ApiParam({ name: 'id', description: 'ID da cultura', type: String }) // Documenta o parâmetro 'id'
  @ApiParam({ name: 'rev', description: 'Revisão do documento para controle de versionamento', type: String }) // Documenta o parâmetro 'rev'
  @ApiResponse({ status: 200, description: 'Cultura removida com sucesso.' }) // Resposta esperada
  @ApiResponse({ status: 404, description: 'Cultura não encontrada.' }) // Possíveis erros
  remove(
    @Param('id') id: string,
    @Param('rev') rev: string,
  ): Promise<nano.DocumentDestroyResponse> {
    return this.culturaService.remove(id, rev);
  }
}
