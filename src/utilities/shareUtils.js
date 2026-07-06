export function generateShareCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function buildShareURL(shareCode) {
  const base = window.location.origin + window.location.pathname;
  return `${base}#/shared/${shareCode}`;
}

export function isMember(trip, uid) {
  return trip?.members?.includes(uid) ?? false;
}