import { Module } from '@nestjs/common';
import { CulturaService } from './cultura.service';
import { CulturaController } from './cultura.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Cultura, CulturaSchema } from './entities/cultura.entity';

@Module({
  imports: [MongooseModule.forFeature([{name : Cultura.name, schema : CulturaSchema}])],
  controllers: [CulturaController],
  providers: [CulturaService],
})
export class CulturaModule {}
