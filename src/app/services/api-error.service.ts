
import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ApiErrorService {

  getErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return error instanceof Error && error.message
        ? error.message
        : 'An unexpected error occurred. Please try again.';
    }

    const body = error.error;

    if (body && typeof body === 'object' && !Array.isArray(body)) {
      const data = body as Record<string, unknown>;

      for (const key of ['detail', 'message', 'error', 'non_field_errors']) {
        const value = data[key];

        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }

        if (Array.isArray(value)) {
          const messages = value.filter(
            (item): item is string =>
              typeof item === 'string' && !!item.trim()
          );

          if (messages.length) {
            return messages.join(' ');
          }
        }
      }

      const fieldErrors: string[] = [];

      for (const [field, value] of Object.entries(data)) {
        if (Array.isArray(value)) {
          const messages = value.filter(
            (item): item is string =>
              typeof item === 'string' && !!item.trim()
          );

          if (messages.length) {
            fieldErrors.push(`${field}: ${messages.join(' ')}`);
          }
        } else if (typeof value === 'string' && value.trim()) {
          fieldErrors.push(`${field}: ${value.trim()}`);
        }
      }

      if (fieldErrors.length) {
        return fieldErrors.join(' | ');
      }
    }

    if (typeof body === 'string' && body.trim()) {
      return body.trim();
    }

    switch (error.status) {
      case 0:
        return 'Unable to connect to the server. Check your network and try again.';

      case 400:
        return 'Invalid request. Please check your input and try again.';

      case 401:
        return 'Your session may have expired. Please log in again.';

      case 403:
        return 'You do not have permission to perform this action.';

      case 404:
        return 'The requested resource could not be found.';

      case 409:
        return 'This action conflicts with existing data.';

      case 422:
        return 'The submitted data could not be processed.';

      case 429:
        return 'Too many requests. Please wait and try again.';

      default:
        return error.status >= 500
          ? 'A server error occurred. Please try again later.'
          : 'Something went wrong. Please try again.';
    }
  }
}
