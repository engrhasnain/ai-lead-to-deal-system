import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/**
 * Guard for destructive endpoints — disabled entirely in public demo mode.
 * Mirrors the Python version's `_block_if_public_demo()` helper.
 */
@Injectable()
export class PublicDemoGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    const publicDemoMode = (process.env.PUBLIC_DEMO_MODE ?? 'true').toLowerCase() === 'true';
    if (publicDemoMode) {
      throw new ForbiddenException('Disabled in the public demo');
    }
    return true;
  }
}
