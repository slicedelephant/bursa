import { Injectable } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DomainException } from '../common/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../security/audit.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new DomainException('CONFLICT', 'Email already registered', 409);
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: dto.displayName,
        role: (dto.role as Role) ?? Role.DONOR,
      },
    });
    await this.audit.record({
      action: 'auth.register',
      actorUserId: user.id,
      metadata: { role: user.role },
    });
    return this.session(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      await this.audit.record({
        action: 'auth.login_failed',
        metadata: { email: dto.email },
      });
      throw new DomainException('UNAUTHORIZED', 'Invalid credentials', 401);
    }
    await this.audit.record({ action: 'auth.login', actorUserId: user.id });
    return this.session(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: { include: { campaign: true } },
        corporateProfile: true,
      },
    });
    if (!user) throw new DomainException('NOT_FOUND', 'User not found', 404);
    return {
      user: this.publicUser(user),
      profile: {
        student: user.studentProfile ?? null,
        corporate: user.corporateProfile ?? null,
      },
    };
  }

  private session(user: User) {
    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
    });
    return { token, user: this.publicUser(user) };
  }

  private publicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
    };
  }
}
