import { Module } from '@nestjs/common';
import { CulturaService } from './cultura.service';
import { CulturaController } from './cultura.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { CulturaEntity, CulturaSchema } from './entities/cultura.entity';

@Module({
  imports: [MongooseModule.forFeature([{name : CulturaEntity.name, schema : CulturaSchema}])],
  controllers: [CulturaController],
  providers: [CulturaService],
})
export class CulturaModule {}
