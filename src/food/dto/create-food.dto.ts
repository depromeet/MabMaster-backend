import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Food } from '../entities/food.entity';
@ApiExtraModels(Food)
export class CreateFoodDto {
  @IsString()
  @ApiProperty({ description: '음식 이름', type: String })
  readonly name: string;
}
