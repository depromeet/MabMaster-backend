import { IsArray, IsString } from 'class-validator';
import { HOT_LEVEL } from 'src/food/enums/hot-level';
import { IReview } from 'src/review/dto/create-reviews.dto';

/**
 * 아래 interface는 임시로 사용합니다. 혜연님 담당부분인 IReview가 수정되면 IReview를 사용할 예정입니다.
 * 혜연님 담당의 IReview의 경우, 다른 controller/service와 연결된 부분이 많아 별도의 작업으로 수정이 필요하여, 지금 PR에서 진행하진 않으려 합니다.
 * 지금은 임시로 아래 선언하는 임시 interface를 사용하고, IReview 리팩토링시 IReview로 대체할 예정입니다:)
 */
export class TemporaryAnswer {
  @IsString()
  foodId: string;

  @IsString()
  hotLevel: HOT_LEVEL;
}
export class CreateUserLevelDto {
  @IsString()
  userId: string;

  @IsArray()
  answers: TemporaryAnswer[];
}
