export function getParamNames(func: Function) {
  const funcString = func.toString();
  const paramsMatch = funcString.match(/\(([^)]*)\)/);
  if (!paramsMatch) {
    return [];
  }
  const params = paramsMatch[1];
  return params
    .split(",")
    .map((param) => param.trim())
    .filter((param) => param.length > 0);
}
