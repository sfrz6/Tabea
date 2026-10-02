/**
 * Application error codes. Every code maps to a translated message, so the user
 * never sees a raw database error or a stack trace.
 */
export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "SESSION_EXPIRED"
  | "FORBIDDEN"
  | "FORBIDDEN_VIEW"
  | "FORBIDDEN_EDIT"
  | "FORBIDDEN_ASSIGN"
  | "FORBIDDEN_ADMIN"
  | "NOT_FOUND"
  | "TASK_NOT_FOUND"
  | "USER_NOT_FOUND"
  | "USER_INACTIVE"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "UNEXPECTED";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly meta: Record<string, string | number> | undefined;

  constructor(code: AppErrorCode, message?: string, meta?: Record<string, string | number>) {
    super(message ?? code);
    this.name = "AppError";
    this.code = code;
    this.meta = meta;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Shape returned by every server action, so forms can render errors consistently. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; code: AppErrorCode; message?: string; fieldErrors?: Record<string, string> };

export function actionOk(): ActionResult<undefined>;
export function actionOk<T>(data: T): ActionResult<T>;
export function actionOk<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function actionError(
  code: AppErrorCode,
  options?: { message?: string; fieldErrors?: Record<string, string> },
): ActionResult<never> {
  return {
    ok: false,
    code,
    ...(options?.message ? { message: options.message } : {}),
    ...(options?.fieldErrors ? { fieldErrors: options.fieldErrors } : {}),
  };
}

/**
 * Converts anything thrown inside a server action into a safe result. Unknown
 * failures are logged on the server and reported to the user as a generic
 * problem, never as internal detail.
 */
export function toActionResult(error: unknown): ActionResult<never> {
  if (isAppError(error)) {
    return actionError(error.code, error.meta ? { message: undefined } : undefined);
  }
  console.error("[tabea] unhandled action error", error);
  return actionError("UNEXPECTED");
}
