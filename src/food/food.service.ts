import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { produceHotLevelId } from 'src/review/utils/produce-hot-level';
import { Repository } from 'typeorm';
import { CreateFoodDto } from './dto/create-food.dto';
import { FindFoodDto } from './dto/find-food.dto';
import { FindFoodsQueryDto } from './dto/find-foods-query.dto';
import { Category } from './entities/category.entity';
import { Food } from './entities/food.entity';
import { FoodLevel } from './entities/food_level.entity';
import { produceFindFoodDto } from './utils/produceFindFoodDto';
import { sortBy } from './utils/sortBy';

@Injectable()
export class FoodService {
  constructor(
    @InjectRepository(Food)
    private readonly foodRepository: Repository<Food>,

    @InjectRepository(FoodLevel)
    private readonly foodLevelRepository: Repository<FoodLevel>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {
    this.foodRepository = foodRepository;
    this.foodLevelRepository = foodLevelRepository;
    this.categoryRepository = categoryRepository;
  }

  async findReviewFoods(): Promise<Food[]> {
    return await this.foodRepository
      .createQueryBuilder('food')
      .select(['food.id', 'food.name', 'food.subName', 'food.imageUrl'])
      .where('food.isTest = true')
      .orderBy('RAND()')
      .limit(3)
      .getMany();
  }

  async findTestFoods(): Promise<Food[]> {
    return await this.foodRepository
      .createQueryBuilder('food')
      .select(['food.id', 'food.name', 'food.subName', 'food.imageUrl'])
      .where('food.isTest = true')
      .getMany();
  }

  async createFoodInfo(foodDetail: CreateFoodDto): Promise<CreateFoodDto> {
    const { name, subName, level, category } = foodDetail;

    // foodLevelId을 사용하여 foodLevel 정보를 가져옴
    const foodLevel = await this.foodLevelRepository
      .createQueryBuilder('foodLevel')
      .select()
      .where('foodLevel.id = :level', { level })
      .getOne();

    // food 값 넣기
    const { id: foodId } = await this.foodRepository
      .createQueryBuilder('food')
      .leftJoin('food.foodLevel', 'foodLevel')
      .insert()
      .into(Food)
      .values({ name, subName, foodLevel })
      .execute()
      .then(({ identifiers }) => {
        if (identifiers.length !== 1) {
          // 하나의 음식만 추가하였으므로, 반드시 identifiers 길이는 반드시 1
          throw new Error();
        }
        return identifiers.pop();
      });

    //음식의 카테고리를 설정하기 위해서 categoryId값을 가져옴
    const { id: categoryId } = await this.categoryRepository
      .createQueryBuilder('category')
      .select(['category.id'])
      .where('category.name = :category', { category })
      .getOne();

    // ManyToMany관계 -> 음식 카테고리 지정
    await this.foodRepository
      .createQueryBuilder('food_category')
      .relation(Food, 'categories')
      .of(foodId)
      .add(categoryId);

    return {
      name,
      subName,
      level,
      category,
    };
  }

  /**
   * 음식 리스트를 가져옵니다. userId가 주어지면 user의 맵레벨에 맞는 음식들만 필터해 가져옵니다.
   * category가 주어지면 category에 해당하는 음식들만 필터해 가져옵니다.
   * userId와 category는 Optional하게 주거나 안 줄 수 있습니다.
   * 경우에 따라서 user의 맵레벨과 상관없이 특정 카테고리의 모든 음식만 가져오는 API가 필요할 수도 있고,
   * 전체 음식 리스트를 가져오고 싶은 경우도 있을 수 있기 때문입니다.
   * @param param userId?: string, category?: string, size?: string, sort?: SORT, hotLevel?: HOT_LEVEL
   * @returns id, name, subName, imageUrl, hotLevel로 이루어진 객체의 배열
   */
  async findFoods(param: FindFoodsQueryDto): Promise<FindFoodDto[]> {
    const { category, hotLevel, size: providedSize, sort } = param;
    const size = providedSize ? Number(providedSize) : 10; // default size = 10

    // hotLevel 없이 요청이 온 경우
    if (!hotLevel) {
      // hotLevel 없고, category도 없는 경우
      if (!category) {
        const query = this.foodRepository.createQueryBuilder('food');

        return sortBy(query, sort)
          .take(size)
          .getMany()
          .then(produceFindFoodDto);
      }

      // hotLevel만 없는 경우
      const query = this.foodRepository
        .createQueryBuilder('food')
        .leftJoinAndSelect('food.categories', 'category')
        .where('category.name = :categoryName', { categoryName: category });

      return sortBy(query, sort).take(size).getMany().then(produceFindFoodDto);
    }

    // hotLevel이 있는 경우
    const hotLevelId = produceHotLevelId(hotLevel);

    // hotLevel은 있지만 category가 없는 경우
    if (!category) {
      const query = this.foodRepository
        .createQueryBuilder('food')
        .leftJoinAndSelect('food.foodLevel', 'foodLevel')
        .where('foodLevel.id = :hotLevelId', { hotLevelId });

      return sortBy(query, sort).take(size).getMany().then(produceFindFoodDto);
    }
    const query = this.foodRepository
      .createQueryBuilder('food')
      .leftJoinAndSelect('food.categories', 'category')
      .leftJoinAndSelect('food.foodLevel', 'foodLevel')
      .where('category.name = :categoryName', { categoryName: category })
      .andWhere('foodLevel.id = :hotLevelId', { hotLevelId });

    return sortBy(query, sort).take(size).getMany().then(produceFindFoodDto);
  }

  // 레벨 별 음식 정보를 가져 옵니다.
  async findUserLevelFoods(param): Promise<Food[]> {
    const { userLevel } = param;

    if (userLevel === '5') {
      return [];
    }

    const { id: foodLevel } = await this.foodLevelRepository
      .createQueryBuilder('foodLevel')
      .leftJoinAndSelect('foodLevel.userLevel', 'userLevel')
      .where('foodLevel.userLevel = :userLevel', { userLevel })
      .getOne();

    return await this.foodRepository
      .createQueryBuilder('food')
      .leftJoinAndSelect('food.foodLevel', 'foodLevel')
      .select(['food.name', 'food.subName', 'food.imageUrl'])
      .where('food.foodLevel = :foodLevel', { foodLevel })
      .orderBy('RAND()')
      .limit(3)
      .getMany();
  }
}
