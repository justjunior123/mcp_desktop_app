/**
 * Format bytes to a human-readable string
 * @param bytes Number of bytes
 * @param decimals Number of decimal places to show
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Create a delay promise
 * @param ms Milliseconds to delay
 * @returns Promise that resolves after the specified delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a random ID
 * @param length Length of the ID
 * @returns Random ID string
 */
export function generateId(length: number = 10): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Truncate a string to a maximum length and add ellipsis if needed
 * @param str String to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated string
 */
export function truncateString(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

/**
 * Capitalize the first letter of each word in a string
 * @param str String to capitalize
 * @returns Capitalized string
 */
export function capitalizeWords(str: string): string {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Check if a value is a valid JSON string
 * @param value Value to check
 * @returns Whether the value is a valid JSON string
 */
export function isValidJson(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch (e) {
    return false;
  }
} 