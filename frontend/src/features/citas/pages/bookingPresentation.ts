export function formatDuration(totalMinutes?: number) {
  const minutes = Number(totalMinutes || 0)
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours && remainingMinutes) return `${hours} h ${remainingMinutes} min`
  if (hours) return `${hours} h`
  return `${remainingMinutes} min`
}
