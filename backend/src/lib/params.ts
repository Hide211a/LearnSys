/** Express 5: req.params values may be string | string[] */
export function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}
