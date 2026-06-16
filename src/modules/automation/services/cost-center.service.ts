import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CostCenter } from '../entities/cost-center.entity';
import { CreateCostCenterDto } from '../dto/create-cost-center.dto';

@Injectable()
export class CostCenterService {
  constructor(
    @InjectRepository(CostCenter)
    private costCenterRepository: Repository<CostCenter>,
    private dataSource: DataSource,
  ) {}

  async create(createCostCenterDto: CreateCostCenterDto): Promise<CostCenter> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existing = await queryRunner.manager.findOne(CostCenter, {
        where: { code: createCostCenterDto.code },
      });

      if (existing) {
        throw new BadRequestException('Cost center code already exists');
      }

      if (createCostCenterDto.parentId) {
        const parent = await queryRunner.manager.findOne(CostCenter, {
          where: { id: createCostCenterDto.parentId },
        });

        if (!parent) {
          throw new NotFoundException('Parent cost center not found');
        }
      }

      const costCenter = queryRunner.manager.create(CostCenter, {
        ...createCostCenterDto,
      });

      const saved = await queryRunner.manager.save(costCenter);
      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<CostCenter[]> {
    return this.costCenterRepository.find({
      where: { isActive: true },
      order: { code: 'ASC' },
    });
  }

  async findOne(id: string): Promise<CostCenter> {
    const costCenter = await this.costCenterRepository.findOne({
      where: { id },
    });

    if (!costCenter) {
      throw new NotFoundException(`Cost center with ID ${id} not found`);
    }

    return costCenter;
  }

  async update(id: string, updateDto: Partial<CreateCostCenterDto>): Promise<CostCenter> {
    const costCenter = await this.findOne(id);

    Object.assign(costCenter, updateDto);
    return this.costCenterRepository.save(costCenter);
  }

  async deactivate(id: string): Promise<CostCenter> {
    const costCenter = await this.findOne(id);
    costCenter.isActive = false;
    return this.costCenterRepository.save(costCenter);
  }
}

