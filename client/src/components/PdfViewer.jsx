import { useState, useMemo, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import toast from 'react-hot-toast';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// Configura el worker de pdf.js para Vite.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default function PdfViewer({ fileUrl, pagina, onPageChange, onEnviarContexto }) {
  const [numPaginas, setNumPaginas] = useState(0);
  const [escala, setEscala] = useState(1.2);
  const [cargando, setCargando] = useState(true);
  const docRef = useRef(null);

  // Búsqueda de texto en el PDF
  const [busqueda, setBusqueda] = useState('');
  const [termino, setTermino] = useState(''); // término efectivamente buscado
  const [coincidencias, setCoincidencias] = useState([]); // array de nº de página (una por ocurrencia)
  const [indiceActual, setIndiceActual] = useState(-1);
  const [buscando, setBuscando] = useState(false);

  const file = useMemo(() => ({ url: fileUrl, withCredentials: true }), [fileUrl]);

  const onLoadSuccess = (pdf) => {
    docRef.current = pdf;
    setNumPaginas(pdf.numPages);
    setCargando(false);
  };

  const irA = (n) => {
    const destino = Math.min(Math.max(1, n || 1), numPaginas || 1);
    onPageChange?.(destino, numPaginas);
  };

  const enviarSeleccion = () => {
    const texto = window.getSelection()?.toString()?.trim();
    if (!texto) {
      toast('Selecciona texto en el PDF primero', { icon: '✋' });
      return;
    }
    onEnviarContexto?.(texto);
    toast.success('Texto enviado al contexto');
  };

  // Recorre todas las páginas y registra una coincidencia por cada ocurrencia.
  const buscar = useCallback(async () => {
    const term = busqueda.trim();
    if (!term || !docRef.current) {
      setTermino('');
      setCoincidencias([]);
      setIndiceActual(-1);
      return;
    }
    setBuscando(true);
    try {
      const re = new RegExp(escapeRegExp(term), 'gi');
      const found = [];
      for (let p = 1; p <= docRef.current.numPages; p++) {
        const page = await docRef.current.getPage(p);
        const tc = await page.getTextContent();
        const texto = tc.items.map((i) => i.str).join(' ');
        const m = texto.match(re);
        if (m) for (let k = 0; k < m.length; k++) found.push(p);
      }
      setTermino(term);
      setCoincidencias(found);
      setIndiceActual(found.length ? 0 : -1);
      if (found.length) {
        irA(found[0]);
        toast.success(`${found.length} coincidencia(s)`);
      } else {
        toast('Sin coincidencias', { icon: '🔍' });
      }
    } finally {
      setBuscando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, numPaginas]);

  const irCoincidencia = (delta) => {
    if (!coincidencias.length) return;
    const next = (indiceActual + delta + coincidencias.length) % coincidencias.length;
    setIndiceActual(next);
    irA(coincidencias[next]);
  };

  const limpiarBusqueda = () => {
    setBusqueda('');
    setTermino('');
    setCoincidencias([]);
    setIndiceActual(-1);
  };

  // Resalta el término en la capa de texto de la página visible.
  const textRenderer = useCallback(
    (textItem) => {
      if (!termino) return textItem.str;
      const re = new RegExp(`(${escapeRegExp(termino)})`, 'gi');
      return textItem.str.replace(re, '<mark class="pdf-find">$1</mark>');
    },
    [termino]
  );

  return (
    <div className="pdf-panel">
      <div className="pdf-toolbar">
        <div className="grupo">
          <button className="btn btn-sm" onClick={() => irA(pagina - 1)} disabled={pagina <= 1}>
            ◀
          </button>
          <span className="pag-indicador">
            Pág.
            <input
              type="number"
              min={1}
              max={numPaginas || 1}
              value={pagina}
              onChange={(e) => irA(Number(e.target.value))}
            />
            / {numPaginas || '—'}
          </span>
          <button
            className="btn btn-sm"
            onClick={() => irA(pagina + 1)}
            disabled={pagina >= numPaginas}
          >
            ▶
          </button>
        </div>

        <div className="grupo grupo-buscar">
          <input
            className="buscar-input"
            placeholder="🔎 Buscar en el PDF…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (termino && busqueda.trim() === termino ? irCoincidencia(1) : buscar());
              if (e.key === 'Escape') limpiarBusqueda();
            }}
          />
          {termino && coincidencias.length > 0 && (
            <span className="buscar-contador">
              {indiceActual + 1}/{coincidencias.length}
            </span>
          )}
          <button className="btn btn-sm" onClick={() => irCoincidencia(-1)} disabled={!coincidencias.length} title="Anterior">
            ↑
          </button>
          <button className="btn btn-sm" onClick={() => irCoincidencia(1)} disabled={!coincidencias.length} title="Siguiente">
            ↓
          </button>
          <button className="btn btn-sm" onClick={buscar} disabled={buscando}>
            {buscando ? '…' : 'Buscar'}
          </button>
          {termino && (
            <button className="btn btn-sm" onClick={limpiarBusqueda} title="Limpiar">
              ✕
            </button>
          )}
        </div>

        <div className="grupo">
          <button className="btn btn-sm" onClick={() => setEscala((s) => Math.max(0.5, s - 0.2))}>
            −
          </button>
          <span className="zoom">{Math.round(escala * 100)}%</span>
          <button className="btn btn-sm" onClick={() => setEscala((s) => Math.min(3, s + 0.2))}>
            +
          </button>
          <button className="btn btn-sm btn-accent" onClick={enviarSeleccion}>
            ⤵ Enviar selección
          </button>
        </div>
      </div>

      <div className="pdf-scroll">
        {cargando && (
          <div className="centro" style={{ color: '#fff' }}>
            Cargando PDF…
          </div>
        )}
        <Document
          file={file}
          onLoadSuccess={onLoadSuccess}
          onLoadError={() => {
            setCargando(false);
            toast.error('No se pudo cargar el PDF');
          }}
          loading=""
        >
          <Page
            pageNumber={pagina}
            scale={escala}
            renderTextLayer
            renderAnnotationLayer={false}
            customTextRenderer={textRenderer}
          />
        </Document>
      </div>
    </div>
  );
}
