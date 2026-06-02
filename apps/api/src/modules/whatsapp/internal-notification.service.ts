import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  InternalNotification,
  InternalNotificationType,
} from './internal-notification.entity';

@Injectable()
export class InternalNotificationService {
  constructor(
    @InjectRepository(InternalNotification)
    private readonly repo: Repository<InternalNotification>,
  ) {}

  async create(data: {
    type: InternalNotificationType;
    title: string;
    body: string;
    patientId?: string;
    appointmentId?: string;
  }): Promise<InternalNotification> {
    return this.repo.save(this.repo.create(data));
  }

  async listRecent(limit = 30, unreadOnly = false) {
    const qb = this.repo
      .createQueryBuilder('n')
      .orderBy('n.createdAt', 'DESC')
      .take(limit);
    if (unreadOnly) qb.andWhere('n.read = false');
    return qb.getMany();
  }

  async markRead(id: string) {
    await this.repo.update(id, { read: true });
  }

  async markAllRead() {
    await this.repo.update({ read: false }, { read: true });
  }

  async countUnread(): Promise<number> {
    return this.repo.count({ where: { read: false } });
  }
}
