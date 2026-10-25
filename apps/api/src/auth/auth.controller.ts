import { Body, Controller, Get, HttpCode, Post, Res, UseGuards, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { validEmail } from '@flowtus/core';
import type { Actor } from '@flowtus/core';
import { config } from '../common/config';
import { PrismaService } from '../common/prisma.service';
import { AdminGuard, CurrentActor } from './admin.guard';

// A real hash so unknown emails cost the same as wrong passwords (no user enumeration through timing).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

@Controller('auth')
export class AuthController {
  constructor(private prisma: PrismaService) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() body: { email?: string; password?: string }, @Res({ passthrough: true }) res: Response) {
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    if (!validEmail(email) || password.length < 8) throw new BadRequestException('Enter a valid email and a password of at least 8 characters.');
    const user = await this.prisma.user.findUnique({ where: { email } });
    const ok = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
    if (!user || !user.active || !ok) throw new UnauthorizedException('Email or password is incorrect.');
    const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: `${config.sessionHours}h` });
    res.cookie(config.cookieName, token, { httpOnly: true, sameSite: 'lax', secure: config.isProd, maxAge: config.sessionHours * 3600_000, path: '/' });
    return { name: user.name, role: user.role };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(config.cookieName, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AdminGuard)
  me(@CurrentActor() actor: Actor) {
    return actor;
  }
}
