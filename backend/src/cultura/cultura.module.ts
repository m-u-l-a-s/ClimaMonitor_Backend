import { Module } from '@nestjs/common';
import { CulturaService } from './cultura.service';
import { CulturaController } from './cultura.controller';

@Module({
  controllers: [CulturaController],
  providers: [CulturaService],
})
export class CulturaModule {}
