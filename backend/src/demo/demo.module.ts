import { Module } from '@nestjs/common';
import { DietsModule } from '../diets/diets.module';
import { DemoResetService } from './demo-reset.service';

@Module({
  imports: [DietsModule],
  providers: [DemoResetService],
})
export class DemoModule {}
