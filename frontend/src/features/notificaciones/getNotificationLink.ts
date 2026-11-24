export function getNotificationLink(link: string | null) {
  if (!link) return null
  const record = /^\/(citas|ordenes)\/(\d+)\/?$/.exec(link)
  if (record) return record[1] === 'citas' ? `/mis-citas?cita=${record[2]}` : `/mis-reparaciones?orden=${record[2]}`
  if (link.startsWith('/recibos/')) return '/mis-recibos'
  return link
}
