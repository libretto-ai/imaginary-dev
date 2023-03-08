import { diffSchemas } from "json-schema-diff";

/** Custom matcher for JSONSchema equality
 *
 * To use:
 * ```
 *   expect.extend({ toEqualJSONSchema });
 * ```
 */
export async function toEqualJSONSchema(actual, expected) {
  const diff = await diffSchemas({
    sourceSchema: expected,
    destinationSchema: actual,
  });
  if (diff.additionsFound && diff.removalsFound) {
    return {
      pass: false,
      message: () =>
        `Schema mismatch, missing ${JSON.stringify(
          diff.removedJsonSchema
        )} but have ${JSON.stringify(diff.addedJsonSchema)} in $`,
    };
  }
  if (diff.additionsFound) {
    return {
      pass: false,
      message: () =>
        `Extra schema found: ${JSON.stringify(
          diff.addedJsonSchema
        )} in ${JSON.stringify(actual)}`,
    };
  }
  if (diff.removalsFound) {
    return {
      pass: false,
      message: () =>
        `Missing schemas: ${JSON.stringify(diff.removedJsonSchema)})`,
    };
  }
  return {
    pass: true,
    message: () => "",
  };
}
