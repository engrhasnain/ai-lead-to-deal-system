import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Response } from 'express';

/**
 * Reshapes every HttpException response body into `{ detail: string | unknown }`
 * to match the FastAPI/Pydantic error shape the frontend was originally built
 * against (FastAPI's default error envelope is `{"detail": "..."}`).
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    let detail: unknown;
    if (typeof body === 'string') {
      detail = body;
    } else if (body && typeof body === 'object') {
      const obj = body as Record<string, unknown>;
      if ('detail' in obj) {
        // Already shaped (e.g. thrown as new HttpException({ detail: ... }, status))
        detail = obj.detail;
      } else if ('message' in obj) {
        detail = Array.isArray(obj.message) ? obj.message.join(', ') : obj.message;
      } else {
        detail = obj;
      }
    } else {
      detail = exception.message;
    }

    response.status(status).json({ detail });
  }
}
