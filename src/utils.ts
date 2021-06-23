export function parseJson<T>(value: string): T | undefined {
  try {
    const parsed: T = JSON.parse(value);
    return parsed;
  } catch {
    return undefined;
  }
}
