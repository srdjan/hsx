/**
 * Result type for representing success/failure without exceptions.
 *
 * @module result
 */

// =============================================================================
// Types
// =============================================================================

/** A successful result containing a value of type T. */
export type Ok<T> = { readonly ok: true; readonly value: T };

/** A failed result containing an error of type E. */
export type Fail<E> = { readonly ok: false; readonly error: E };

/** A Result is either Ok<T> or Fail<E>. */
export type Result<T, E> = Ok<T> | Fail<E>;

// =============================================================================
// Constructors
// =============================================================================

/** Create a successful Result. */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/** Create a failed Result. */
export function fail<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// =============================================================================
// Pattern Matching
// =============================================================================

/** Pattern match on a Result, handling both ok and fail cases. */
export function match<T, E, R>(
  result: Result<T, E>,
  handlers: { readonly ok: (value: T) => R; readonly fail: (error: E) => R },
): R {
  return result.ok ? handlers.ok(result.value) : handlers.fail(result.error);
}
