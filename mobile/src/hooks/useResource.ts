import { useCallback, useEffect, useRef, useState } from 'react';
export default function useResource<T>(loader: () => Promise<T>) {
  const ref = useRef(loader); ref.current = loader;
  const sequence = useRef(0);
  const [value, setValue] = useState<T>(); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const reload = useCallback(async () => {
    const ticket = ++sequence.current; setLoading(true); setError('');
    try { const next = await ref.current(); if (ticket === sequence.current) setValue(next); }
    catch (e) { if (ticket === sequence.current) setError(e instanceof Error ? e.message : 'No se pudo cargar.'); }
    finally { if (ticket === sequence.current) setLoading(false); }
  }, []);
  useEffect(() => { void reload(); return () => { sequence.current++; }; }, [reload]);
  return { value, loading, error, reload };
}
