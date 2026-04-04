export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'EXTERNAL_API_ERROR'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Errors = {
  validation: (msg = '입력값이 올바르지 않습니다.') =>
    new AppError('VALIDATION_ERROR', msg),
  notFound: (msg = '데이터를 찾을 수 없습니다.') =>
    new AppError('NOT_FOUND', msg),
  externalApi: (msg = '외부 API 호출에 실패했습니다.') =>
    new AppError('EXTERNAL_API_ERROR', msg),
  internal: (msg = '서버 오류가 발생했습니다.') =>
    new AppError('INTERNAL_ERROR', msg),
};
