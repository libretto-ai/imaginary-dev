import debounce from "p-debounce";
import PQueue from "p-queue";

/**
 * Wraps an async function so that there is only one concurrent run happening at
 * a time
 *
 * e.g.
 *
 * ```
 * const writeMessage = makeSerializedAsyncFunction((msg) => fs.writeFile(msg, 'file.txt'));
 *
 * writeMessage("one");
 * writeMessage("two");
 * writeMessage("three");
 * ```
 *
 * In this case only writeMessage("three") will actually fire... and if another
 * message comes in while writeMessage("three") is still running, it will get
 * queued up for later
 */
export function makeSerializedAsyncFunction<P extends any[], R>(
  fn: (...args: P) => Promise<R>
): (...args: P) => Promise<void | R> {
  const q = new PQueue({ concurrency: 1 });

  const debouncedAdd: PQueue["add"] = debounce(q.add.bind(q), 100);
  function addFn(...args: P) {
    return debouncedAdd(() => fn(...args));
  }

  return addFn;
}
