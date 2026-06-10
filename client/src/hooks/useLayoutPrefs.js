import { useState, useEffect, useCallback } from 'react';

const KEY = 'transcriptor.layout';

// Preferencias de disposición del espacio de trabajo, persistidas por usuario
// en localStorage. `pdfPrimero` indica si el visor de PDF va a la izquierda.
export function useLayoutPrefs() {
  const [prefs, setPrefs] = useState(() => {
    try {
      return { pdfPrimero: true, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    } catch {
      return { pdfPrimero: true };
    }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  }, [prefs]);

  const intercambiarLados = useCallback(
    () => setPrefs((p) => ({ ...p, pdfPrimero: !p.pdfPrimero })),
    []
  );

  return { prefs, setPrefs, intercambiarLados };
}
