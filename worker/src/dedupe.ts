export async function generateFingerprint(
  title: string,
  start_datetime: string,
  source_id: string
): Promise<string> {
  const dateOnly = start_datetime.slice(0, 10); // 'YYYY-MM-DD'
  const raw = `${title.toLowerCase().trim()}|${dateOnly}|${source_id}`;
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
