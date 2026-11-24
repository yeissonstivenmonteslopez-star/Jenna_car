// From Uiverse.io by Praashoo7 - https://uiverse.io/Praashoo7/fat-horse-65
// MIT License, Copyright (c) Praashoo7 (Prashant)
import { Link } from 'react-router-dom'
import './convenio-unavailable.css'

export default function ConvenioUnavailablePage() {
  return (
    <main className="convenio-unavailable" aria-labelledby="convenio-unavailable-title">
      <section className="convenio-unavailable__content">
        <div className="convenio-unavailable__card" aria-hidden="true">
          <div className="convenio-unavailable__tv-main">
            <div className="convenio-unavailable__antenna">
              <div className="convenio-unavailable__antenna-shadow" />
              <div className="convenio-unavailable__a1" /><div className="convenio-unavailable__a1d" />
              <div className="convenio-unavailable__a2" /><div className="convenio-unavailable__a2d" />
            </div>
            <div className="convenio-unavailable__tv">
              <div className="convenio-unavailable__display"><div className="convenio-unavailable__screen"><span>NOT FOUND</span></div></div>
              <div className="convenio-unavailable__controls"><div className="convenio-unavailable__button-one"><div /></div><div className="convenio-unavailable__button-two" /><div className="convenio-unavailable__speaker"><i /><i /><i /></div></div>
            </div>
            <div className="convenio-unavailable__base"><i /><i /><b /></div>
          </div>
          <div className="convenio-unavailable__digits"><span>4</span><span>0</span><span>4</span></div>
        </div>
        <div className="convenio-unavailable__copy">
          <p>Jenna Car</p>
          <h1 id="convenio-unavailable-title">Esta sección no está disponible.</h1>
          <p>El portal de convenios aún no está habilitado.</p>
          <Link to="/" className="convenio-unavailable__action">Volver al inicio</Link>
        </div>
      </section>
    </main>
  )
}
