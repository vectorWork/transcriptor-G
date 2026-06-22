import { useEffect, useMemo, useState } from 'react';
import { registrosApi } from '../api/client.js';
import { formatearId } from '../utils/constants.js';

// Modal que el admin abre desde la columna "Registros" de la tabla de gacetas
// para ver, sin salir de la tabla, las personas registradas en esa gaceta.
export default function RegistrosGacetaModal({ gaceta, onCerrar }) {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');

  // Cerrar con Esc.
  useEffect(() => {
    if (!gaceta) return;
    const onKey = (e) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gaceta, onCerrar]);

  // Carga los registros de la gaceta seleccionada.
  useEffect(() => {
    if (!gaceta) return;
    setCargando(true);
    setFiltro('');
    registrosApi
      .listar(gaceta._id)
      .then((r) => setRegistros(r.data.registros))
      .catch(() => setRegistros([]))
      .finally(() => setCargando(false));
  }, [gaceta]);

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return registros;
    return registros.filter((r) =>
      `${r.nombres} ${r.apellidos} ${formatearId(r.idPrefijo, r.idNumero)} ${r.accion}`
        .toLowerCase()
        .includes(q)
    );
  }, [registros, filtro]);

  if (!gaceta) return null;

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-card modal-ancho" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-lista-head">
          <h3 className="modal-titulo">
            Personas registradas · Gaceta {gaceta.numero || gaceta.nombreArchivo}
          </h3>
          <button className="btn btn-sm" onClick={onCerrar} title="Cerrar (Esc)">
            ✕
          </button>
        </div>

        {!cargando && registros.length > 0 && (
          <input
            className="filtro-input"
            placeholder="🔎 Filtrar por nombre, identificación o acción…"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        )}

        <div className="modal-lista-body">
          {cargando ? (
            <div className="muted centro">Cargando registros…</div>
          ) : registros.length === 0 ? (
            <div className="muted centro">Esta gaceta no tiene personas registradas.</div>
          ) : (
            <table className="tabla tabla-registros">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Identificación</th>
                  <th>Acción</th>
                  <th>Pág.</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((r) => (
                  <tr key={r._id} title={r.contexto}>
                    <td>
                      <strong>
                        {r.nombres} {r.apellidos}
                      </strong>
                    </td>
                    <td>{formatearId(r.idPrefijo, r.idNumero)}</td>
                    <td>{r.accion}</td>
                    <td>{r.pagina}</td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted centro">
                      Ninguna coincide con el filtro
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="modal-acciones">
          <span className="muted" style={{ marginRight: 'auto' }}>
            Total: {registros.length}
          </span>
          <button className="btn" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
