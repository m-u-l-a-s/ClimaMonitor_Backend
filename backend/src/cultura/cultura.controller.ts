import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, Put, Query } from '@nestjs/common';
import { CulturaService } from './cultura.service';
import { CulturaDto } from './dto/cultura.dto';
import { CulturaDocument, Cultura } from './entities/cultura.entity';
import { ApiOperation, ApiResponse, ApiTags, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { HttpStatusCode } from 'axios';

@ApiTags('Cultura') // Tag para agrupar endpoints no Swagger
@Controller('cultura')
export class CulturaController {
  constructor(private readonly culturaService: CulturaService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria uma nova cultura' }) // Descrição do endpoint
  @ApiResponse({ status: 201, description: 'Cultura criada com sucesso.', type: Cultura }) // Resposta esperada
  @ApiResponse({ status: 400, description: 'Dados inválidos.' }) // Possíveis erros
  @ApiBody({ type: CulturaDto, description: 'Dados da nova cultura' }) // Documenta o corpo da requisição
  create(@Body() dto: CulturaDto): Promise<CulturaDocument> {
    return this.culturaService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lista todas as culturas' }) // Descrição do endpoint
  @ApiResponse({ status: 200, description: 'Culturas retornadas com sucesso.', type: [Cultura] }) // Resposta esperada
  findAll(): Promise<CulturaDocument[]> {
    return this.culturaService.findAll();
  }

  @Get("user/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lista todas as culturas de um usuário' }) // Descrição do endpoint
  @ApiResponse({ status: 200, description: 'Culturas retornadas com sucesso.', type: [Cultura] }) // Resposta esperada
  findAllByUserId(@Param("id") id : String): Promise<CulturaDocument[]> {
    return this.culturaService.findAllByUserId(id);
  }


  // @Get(':id')
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Retorna uma cultura específica por ID' }) 
  // @ApiParam({ name: 'id', description: 'ID da cultura', type: String }) 
  // @ApiResponse({ status: 200, description: 'Cultura retornada com sucesso.', type: Cultura })
  // @ApiResponse({ status: 404, description: 'Cultura não encontrada.' })
  // findOne(@Param('id') id: string): Promise<CulturaDocument> {
  //   return this.culturaService.findOne(id);
  // }

  @Put(':id/')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualiza uma cultura existente' }) // Descrição do endpoint
  @ApiParam({ name: 'id', description: 'ID da cultura', type: String }) // Documenta o parâmetro 'id'
  @ApiBody({ type: CulturaDto, description: 'Dados atualizados da cultura' }) // Documenta o corpo da requisição
  @ApiResponse({ status: 200, description: 'Cultura atualizada com sucesso.' }) // Resposta esperada
  @ApiResponse({ status: 404, description: 'Cultura não encontrada.' }) // Possíveis erros
  update(
    @Param('id') id: string,
    @Body() dto: CulturaDto,
  ): Promise<CulturaDocument> {
    return this.culturaService.update(id, dto);
  }

  @Delete(':id/')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove uma cultura existente' }) // Descrição do endpoint
  @ApiParam({ name: 'id', description: 'ID da cultura', type: String }) // Documenta o parâmetro 'id'
  @ApiResponse({ status: 200, description: 'Cultura removida com sucesso.' }) // Resposta esperada
  @ApiResponse({ status: 404, description: 'Cultura não encontrada.' }) // Possíveis erros
  remove(@Param('id') id: string): Promise<HttpStatusCode> {
    return this.culturaService.remove(id);
  }

  @ApiQuery({ name: "lastPulledAt", required: false })
  @Get("/sync/:userId")
  async pullChanges(@Param("userId") userId : string, @Query('lastPulledAt') lastPulledAt?: number ) {
    return this.culturaService.pull(userId, lastPulledAt);
  }

  @Post("/sync")
  async pushChanges(@Body() changes: any) {
    return this.culturaService.push(changes);
  }
}
