import { CanActivate, createParamDecorator, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import type { Actor } from '@flowtus/core';
import { config } from '../common/config';
import { PrismaService } from '../common/prisma.service';

export const ROLES_KEY = 'roles';
/** Restricts a route to the listed roles (the guard always requires a signed-in, active admin user). */
export const Roles = (...roles: Actor['role'][]) => SetMetadata(ROLES_KEY, roles);
export const CurrentActor = createParamDecorator((_: unknown, ctx: ExecutionContext): Actor => ctx.switchToHttp().getRequest().actor);

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private prisma: PrismaService, private reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const token = req.cookies?.[config.cookieName] || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Sign in to continue.');
    let payload: any;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      throw new UnauthorizedException('Your session has expired. Sign in again.');
    }
    // Cookie-authenticated writes must carry a custom header, which a cross-site form post cannot set (CSRF defence in depth).
    if (!SAFE.has(req.method) && req.cookies?.[config.cookieName] && req.headers['x-requested-with'] !== 'flowtus-admin') {
      throw new ForbiddenException('Missing request header.');
    }
    const user = await this.prisma.user.findUnique({ where: { id: String(payload.sub) } });
    if (!user || !user.active) throw new UnauthorizedException('This account is no longer active.');
    req.actor = { name: user.name, role: user.role } as Actor;
    const roles: string[] | undefined = this.reflector.getAllAndOverride(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (roles?.length && !roles.includes(user.role)) throw new ForbiddenException('Only the owner can do this.');
    return true;
  }
}
