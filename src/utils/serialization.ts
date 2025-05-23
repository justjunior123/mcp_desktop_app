/**
 * Custom JSON stringify replacer to handle BigInt values
 */
export function serializeBigInt(value: any, key?: string): any {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(item => serializeBigInt(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, serializeBigInt(v)])
    );
  }
  return value;
} 