import { RATE_LIMIT_RPM, RATE_LIMIT_WINDOW_MS } from './constants';

const ipMap = new Map<string, number[]>();

// Clean stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of ipMap) {
    const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (valid.length === 0) {
      ipMap.delete(ip);
    } else {
      ipMap.set(ip, valid);
    }
  }
}, 5 * 60 * 1000);

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = ipMap.get(ip) || [];

  // Remove expired timestamps
  const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (valid.length >= RATE_LIMIT_RPM) {
    ipMap.set(ip, valid);
    return { allowed: false, remaining: 0 };
  }

  valid.push(now);
  ipMap.set(ip, valid);
  return { allowed: true, remaining: RATE_LIMIT_RPM - valid.length };
}
