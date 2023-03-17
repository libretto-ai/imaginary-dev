import retry from "async-retry";

/**
 * Wrap an existing promise-based function in a retrier from `async-retry`.
 *
 * Adds an extra option to the retry options object, `shouldRetry` which is a
 * simple boolean check after an error fires to know if the function should stop
 * retrying
 *
 * @example
 * ```
 * async function run(s: string, n: number): Promise<string> {
 *    // body here
 * }
 *
 * const runWithRetry = wrapWithRetry(run, {
 *   shouldRetry(e) {
 *     // never retry TypeError
 *     if (e.name === 'TypeError') {
 *        return false;
 *     }
 *     return true;
 *   }
 * });
 *
 * await run('foo', 123);
 *
 * ```
 */
export function wrapWithRetry<A extends any[], R>(
  f: (...args: A) => Promise<R>,
  opts?: retry.Options & {
    shouldRetry?: (e: Error, attempt: number) => boolean;
  }
): (...args: A) => Promise<R> {
  return (...args: A) => {
    return retry(async (bail, attempt) => {
      if (opts?.shouldRetry) {
        try {
          return await f(...args);
        } catch (ex) {
          if (!opts.shouldRetry(ex, attempt)) {
            bail(ex);
          }
        }
      }

      return f(...args);
    }, opts);
  };
}
