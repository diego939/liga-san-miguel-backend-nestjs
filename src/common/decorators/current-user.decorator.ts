import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type JwtUserPayload = {
  sub: number;
  email: string;
  rolId: number;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUserPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtUserPayload }>();
    return request.user;
  },
);
