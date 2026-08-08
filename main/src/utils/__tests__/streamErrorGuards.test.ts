import { EventEmitter } from 'events';
import { describe, expect, it, vi } from 'vitest';
import { attachBrokenPipeGuard } from '../streamErrorGuards';

function createError(code: string, message: string) {
  const error = new Error(message) as NodeJS.ErrnoException;
  error.code = code;
  return error;
}

describe('attachBrokenPipeGuard', () => {
  it('swallows broken-pipe stream errors without rethrowing', () => {
    const stream = new EventEmitter();
    const reportUnexpectedError = vi.fn();

    attachBrokenPipeGuard(
      stream as EventEmitter & {
        on: (event: 'error', listener: (error: Error) => void) => EventEmitter;
        off: (event: 'error', listener: (error: Error) => void) => EventEmitter;
      },
      reportUnexpectedError,
    );

    expect(() => {
      stream.emit('error', createError('EPIPE', 'broken pipe'));
    }).not.toThrow();
    expect(reportUnexpectedError).not.toHaveBeenCalled();
  });

  it('reports unexpected stream errors', () => {
    const stream = new EventEmitter();
    const reportUnexpectedError = vi.fn();
    const error = createError('EPERM', 'permission denied');

    attachBrokenPipeGuard(
      stream as EventEmitter & {
        on: (event: 'error', listener: (error: Error) => void) => EventEmitter;
        off: (event: 'error', listener: (error: Error) => void) => EventEmitter;
      },
      reportUnexpectedError,
    );

    stream.emit('error', error);

    expect(reportUnexpectedError).toHaveBeenCalledOnce();
    expect(reportUnexpectedError).toHaveBeenCalledWith(error);
  });
});
