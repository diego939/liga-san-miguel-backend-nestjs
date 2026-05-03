import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../constants';

function requestPath(
  req: { path?: string; originalUrl?: string; url?: string },
): string {
  if (req.path) {
    return req.path.split('?')[0] ?? '/';
  }
  const raw = req.originalUrl ?? req.url ?? '/';
  return raw.split('?')[0] ?? '/';
}

/** Rutas de Swagger / OpenAPI (no van por decoradores @Public) */
function isOpenApiPath(path: string): boolean {
  if (path === '/docs' || path.startsWith('/docs/')) return true;
  if (path.startsWith('/docs-')) return true;
  if (path === '/api/docs' || path.startsWith('/api/docs/')) return true;
  if (path.startsWith('/api/docs-')) return true;
  return false;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (isOpenApiPath(requestPath(context.switchToHttp().getRequest()))) {
      return true;
    }
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<TUser>(
    err: Error | undefined,
    user: TUser,
    info: Error | undefined,
  ): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException(info?.message ?? 'No autorizado');
    }
    return user;
  }
}
