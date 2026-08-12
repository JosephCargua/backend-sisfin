import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Persona } from './entities/persona.entity';
import { CreatePersonaDto } from './dto/create-persona.dto';
import { UpdatePersonaDto } from './dto/update-persona.dto';

@Injectable()
export class PersonasService {
  constructor(
    @InjectRepository(Persona)
    private readonly personaRepository: Repository<Persona>,
  ) {}

  async create(createPersonaDto: CreatePersonaDto): Promise<Persona> {
    const persona = this.personaRepository.create(createPersonaDto);
    return await this.personaRepository.save(persona);
  }

  async findAll(query: any): Promise<Persona[]> {
    let whereConditions: any[] = [];
    const baseCondition: any = {};

    if (query.estado && query.estado !== 'Todos') {
      baseCondition.estado = query.estado;
    }

    if (query.tipo && query.tipo !== 'Todos') {
      baseCondition.tipo = query.tipo;
    }

    if (query.filtro) {
      whereConditions = [
        { ...baseCondition, nombre: Like(`%${query.filtro}%`) },
        { ...baseCondition, ruc: Like(`%${query.filtro}%`) },
        { ...baseCondition, cedula: Like(`%${query.filtro}%`) }
      ];
    } else {
      whereConditions = [baseCondition];
    }

    return await this.personaRepository.find({
      where: whereConditions,
      order: { nombre: 'ASC' },
      relations: ['autorizacionesSri'],
    });
  }

  async findOne(id: string): Promise<Persona> {
    const persona = await this.personaRepository.findOne({ 
      where: { id },
      relations: ['autorizacionesSri'],
    });
    if (!persona) {
      throw new NotFoundException(`Persona con ID ${id} no encontrada`);
    }
    return persona;
  }

  async update(id: string, updatePersonaDto: UpdatePersonaDto): Promise<Persona> {
    const persona = await this.findOne(id);
    this.personaRepository.merge(persona, updatePersonaDto);
    return await this.personaRepository.save(persona);
  }

  async remove(id: string): Promise<void> {
    const persona = await this.findOne(id);
    persona.estado = 'Inactivo';
    await this.personaRepository.save(persona);
  }
}
