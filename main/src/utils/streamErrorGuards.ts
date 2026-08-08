type GuardedErrorStream = {
  on: (event: 'error', listener: (error: Error) => void) => unknown;
  off?: (event: 'error', listener: (error: Error) => void) => unknown;
  removeListener?: (event: 'error', listener: (error: Error) => void) => unknown;
};

export function isBrokenPipeError(error: unknown): error is NodeJS.ErrnoException {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error ? error.code : undefined;
  return code === 'EPIPE' || code === 'ERR_STREAM_DESTROYED';
}

export function attachBrokenPipeGuard(
  stream: GuardedErrorStream | null | undefined,
  reportUnexpectedError?: (error: Error) => void,
) {
  if (!stream) {
    return () => undefined;
  }

  const handleError = (error: Error) => {
    if (isBrokenPipeError(error)) {
      return;
    }

    reportUnexpectedError?.(error);
  };

  stream.on('error', handleError);

  return () => {
    if (typeof stream.off === 'function') {
      stream.off('error', handleError);
      return;
    }

    if (typeof stream.removeListener === 'function') {
      stream.removeListener('error', handleError);
    }
  };
}
