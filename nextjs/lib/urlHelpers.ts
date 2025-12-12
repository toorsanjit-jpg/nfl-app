// nextjs/lib/urlHelpers.ts

export function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export function pillHref(
  basePath: string,
  current: URLSearchParams,
  key: string,
  value: string | null
) {
  const next = new URLSearchParams(current.toString());

  if (value === null) {
    next.delete(key);
  } else {
    next.set(key, value);
  }

  const qs = next.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
