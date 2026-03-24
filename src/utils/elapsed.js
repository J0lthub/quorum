export function elapsed(startedAt) {
  if (!startedAt) return ''
  const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  if (diff < 0) return '0s'
  if (diff >= 86400) return `${Math.floor(diff / 86400)}d ${Math.floor((diff % 86400) / 3600)}h`
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  const s = diff % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}
