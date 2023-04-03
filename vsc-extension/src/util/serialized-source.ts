import {
  MaybeSelectedFunction,
  SerializableSourceFileMap,
} from "../../src-shared/source-info";

export function findMatchingFunction(
  sources: SerializableSourceFileMap,
  selectedFunction: MaybeSelectedFunction
) {
  if (!selectedFunction) {
    return undefined;
  }
  const matchingSource = Object.values(sources).find(
    (source) => source.sourceFile.fileName === selectedFunction.fileName
  );
  if (!matchingSource) {
    return undefined;
  }
  const matchingFunction = matchingSource.functions.find(
    (fn) => fn.name === selectedFunction.functionName
  );
  return matchingFunction;
}
