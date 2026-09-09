
import { useState } from 'react'
import { X, Maximize2 } from 'lucide-react'

const images = [
  { src: '/imagen1.jpeg', title: 'Entrega de precisión', caption: 'Vehículos premium, tratados con el cuidado que merecen.' },
  { src: '/imagen2.jpeg', title: 'Área de diagnóstico', caption: 'Tecnología y experiencia en cada revisión.' },
  { src: '/imagen3.jpeg', title: 'Estudio Jenna Car', caption: 'Un espacio diseñado alrededor de tu vehículo.' },
  { src: '/imagen4.jpeg', title: 'Detalle artesanal', caption: 'El acabado final también cuenta.' },
]

export function Gallery() {
  const [selected, setSelected] = useState<(typeof images)[number] | null>(null)
  return <>
    <section id="galeria" className="bg-secondary px-6 py-24 lg:px-10 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div><p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">Nuestro espacio</p><h2 className="font-serif text-4xl text-secondary-foreground sm:text-6xl">Conoce nuestro<br /><span className="text-muted-foreground">taller.</span></h2></div>
        <div className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{images.map((image, index) => <button key={index} onClick={() => setSelected(image)} className="group relative aspect-[4/5] overflow-hidden bg-muted text-left"><img src={image.src} alt={image.title} className="h-full w-full object-cover grayscale transition duration-700 group-hover:scale-105 group-hover:grayscale-0" /><div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-transparent to-transparent opacity-80" /><div className="absolute inset-x-5 bottom-5 text-primary-foreground"><p className="font-serif text-xl">{image.title}</p><p className="mt-1 text-xs text-primary-foreground/65">{image.caption}</p></div><span className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center border border-primary-foreground/30 text-primary-foreground opacity-0 transition group-hover:opacity-100"><Maximize2 size={15} /></span></button>)}</div>
      </div>
    </section>
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/90 p-5 backdrop-blur-sm" onClick={() => setSelected(null)}><div className="relative max-h-[90vh] max-w-4xl" onClick={(event) => event.stopPropagation()}><img src={selected.src} alt={selected.title} className="max-h-[78vh] w-auto object-contain" /><p className="mt-4 font-serif text-2xl text-primary-foreground">{selected.title}</p><button aria-label="Cerrar galería" onClick={() => setSelected(null)} className="absolute -right-2 -top-12 text-primary-foreground"><X size={24} /></button></div></div>}
  </>
}
