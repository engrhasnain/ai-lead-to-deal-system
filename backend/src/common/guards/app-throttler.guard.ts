import { ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

/**
 * Same 429 response shape as the Python version's slowapi rate-limit handler:
 * `{"detail": "Demo rate limit reached — please try again shortly."}`.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(
    _context: ExecutionContext,
    _throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new HttpException(
      { detail: 'Demo rate limit reached — please try again shortly.' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
