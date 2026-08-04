import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Persona } from './persona.entity';

@Entity('autorizaciones_sri')
export class AutorizacionSri {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'persona_id', type: 'uuid' })
  personaId: string;

  @Column()
  autorizacion: string;

  @Column({ name: 'tipo_comprobante' })
  tipoComprobante: string;

  @Column({ name: 'serie_inicio', nullable: true })
  serieInicio: string;

  @Column({ name: 'serie_fin', nullable: true })
  serieFin: string;

  @Column({ name: 'fecha_inicio', type: 'date', nullable: true })
  fechaInicio: Date;

  @Column({ name: 'fecha_fin', type: 'date', nullable: true })
  fechaFin: Date;

  @ManyToOne(() => Persona, persona => persona.autorizacionesSri, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'persona_id' })
  persona: Persona;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
