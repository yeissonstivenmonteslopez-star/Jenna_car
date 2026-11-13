import { useEffect, useState } from 'react'
import { authHeaders, getApiUrl } from '@/services/apiClient'

type RepairPhoto = { id: number; descripcion: string | null; created_at: string | null }

export default function MechanicPhotoGallery({ images, token }: { images: RepairPhoto[]; token: string }) {
  const [urls, setUrls] = useState<Record<number, string>>({})
  useEffect(() => {
    let active = true
    const temporary: string[] = []
    Promise.all(images.map(async (image) => {
      try {
        const response = await fetch(getApiUrl(`/api/mechanic/images/${image.id}`), { headers: authHeaders(token) })
        if (!response.ok) return null
        const url = URL.createObjectURL(await response.blob())
        if (!active) { URL.revokeObjectURL(url); return null }
        temporary.push(url)
        return [image.id, url] as const
      } catch { return null }
    })).then((entries) => {
      if (active) setUrls(Object.fromEntries(entries.filter((entry): entry is NonNullable<typeof entry> => entry !== null)))
    })
    return () => { active = false; temporary.forEach(URL.revokeObjectURL) }
  }, [images, token])

  if (!images.length) return null
  return <div className="flex flex-wrap gap-3" aria-label="Fotografías del trabajo">
    {[...images].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '')).map((image) => <figure key={image.id} className="grid gap-1">
      {urls[image.id] ? <img src={urls[image.id]} alt={image.descripcion || 'Evidencia de reparación'} className="h-24 w-24 rounded-md border border-white/10 object-cover" /> : <div className="flex h-24 w-24 items-center justify-center rounded-md border border-white/10 text-xs text-white/40">Cargando foto</div>}
      <figcaption className="max-w-24 truncate text-[10px] text-white/45">{image.descripcion || 'Evidencia'}</figcaption>
    </figure>)}
  </div>
}
