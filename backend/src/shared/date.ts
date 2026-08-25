import { BadRequestException } from '@nestjs/common';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function assertValidDate(date: string): void {
  if (!DATE_RE.test(date)) {
    throw new BadRequestException('date must be in YYYY-MM-DD format');
  }
}
