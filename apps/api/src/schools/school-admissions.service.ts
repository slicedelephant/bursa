import { Inject, Injectable } from '@nestjs/common';
import { VerificationStatus } from '@prisma/client';
import { DomainException } from '../common/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import { parseAdmissionCsv } from './admission-import';
import {
  REGISTRAR_PROVIDER,
  type RegistrarProvider,
} from './registrar.provider.interface';
import { buildStudentReportedEvent } from './school-webhook-events';
import { SchoolWebhookService } from './school-webhook.service';

/**
 * Student verification (E8): import an admission list, then verify/reject rows.
 * A VERIFIED admission is the trust anchor that lets a matching student campaign
 * go live (Constitution II). Verification cross-checks the (mock) registrar seam.
 */
@Injectable()
export class SchoolAdmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REGISTRAR_PROVIDER) private readonly registrar: RegistrarProvider,
    private readonly webhooks: SchoolWebhookService,
  ) {}

  async import(schoolId: string, csv: string) {
    await this.requireSchool(schoolId);
    const parsed = parseAdmissionCsv(csv);
    if (parsed.records.length > 0) {
      await this.prisma.$transaction(
        parsed.records.map((record) =>
          this.prisma.admissionRecord.upsert({
            where: { schoolId_admissionRef: { schoolId, admissionRef: record.admissionRef } },
            update: {
              studentEmail: record.studentEmail,
              studentName: record.studentName,
              programName: record.programName,
            },
            create: {
              schoolId,
              studentEmail: record.studentEmail,
              studentName: record.studentName,
              programName: record.programName,
              admissionRef: record.admissionRef,
              status: VerificationStatus.PENDING,
            },
          }),
        ),
      );
    }
    return {
      imported: parsed.records.length,
      duplicates: parsed.duplicates,
      errors: parsed.errors,
    };
  }

  list(schoolId: string, status?: VerificationStatus) {
    return this.prisma.admissionRecord.findMany({
      where: { schoolId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async verify(schoolId: string, recordId: string, reviewerId: string) {
    const record = await this.requireRecord(schoolId, recordId);
    const lookup = await this.registrar.lookupAdmission(schoolId, record.admissionRef);
    if (!lookup.found) {
      throw new DomainException(
        'ADMISSION_NOT_ON_FILE',
        'The registrar does not recognise this admission reference',
        409,
      );
    }
    const updated = await this.prisma.admissionRecord.update({
      where: { id: recordId },
      data: {
        status: VerificationStatus.VERIFIED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        note: null,
      },
    });
    await this.emitReported(schoolId, updated);
    return updated;
  }

  async reject(schoolId: string, recordId: string, reviewerId: string, note: string) {
    await this.requireRecord(schoolId, recordId);
    const updated = await this.prisma.admissionRecord.update({
      where: { id: recordId },
      data: {
        status: VerificationStatus.REJECTED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        note,
      },
    });
    await this.emitReported(schoolId, updated);
    return updated;
  }

  private emitReported(
    schoolId: string,
    record: { id: string; studentName: string; admissionRef: string; status: string },
  ): Promise<void> {
    return this.webhooks.emit(
      buildStudentReportedEvent(schoolId, {
        id: record.id,
        studentName: record.studentName,
        admissionRef: record.admissionRef,
        status: record.status,
      }),
    );
  }

  private async requireRecord(schoolId: string, recordId: string) {
    const record = await this.prisma.admissionRecord.findFirst({
      where: { id: recordId, schoolId },
    });
    if (!record) {
      throw new DomainException('NOT_FOUND', 'Admission record not found', 404);
    }
    return record;
  }

  private async requireSchool(schoolId: string) {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      throw new DomainException('NOT_FOUND', 'School not found', 404);
    }
    return school;
  }
}
