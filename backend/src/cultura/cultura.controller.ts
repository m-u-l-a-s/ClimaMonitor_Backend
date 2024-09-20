import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { CulturaService } from './cultura.service';
import { CulturaDto } from './dto/cultura.dto';
import { CulturaEntity } from './entities/cultura.entity';
import * as nano from 'nano';


@Controller('cultura')
export class CulturaController {
  constructor(private readonly culturaService: CulturaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto : CulturaDto ) : Promise<CulturaEntity> {
    return this.culturaService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll() : Promise<CulturaEntity[]> {
    return this.culturaService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string) : Promise<CulturaEntity>{
    return this.culturaService.findOne(id);
  }

  @Put(':id/:rev')
  @HttpCode(HttpStatus.OK)
  update(@Param('id') id: string, @Param('rev') rev : string, @Body() dto : CulturaDto) : Promise<nano.DocumentInsertResponse> {
    return this.culturaService.update(id, rev, dto);
  }

  @Delete(':id/:rev')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @Param('rev') rev: string) : Promise<nano.DocumentDestroyResponse> {
    return this.culturaService.remove(id, rev);
  }
}
