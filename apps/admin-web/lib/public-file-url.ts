export function publicFileUrl(value: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (!apiUrl) return value

  try {
    const path = value.startsWith('/') ? value : new URL(value).pathname
    if (!path.startsWith('/uploads/')) return value
    return new URL(path, new URL(apiUrl).origin).toString()
  } catch {
    return value
  }
}
