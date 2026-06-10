import { useEffect, useMemo, useState } from 'react';

function RegistroItem({ registro, onEditar, onEliminar, onIrPagina }) {
  const [expandido, setExpandido] = useState(false);
  const ctx = registro.contexto || '';
  const largo = ctx.length > 160;

  return (
    <div className="drawer-item">
      <div className="drawer-item-top">
        <div className="cel-persona">
          <strong>
            {registro.nombres} {registro.apellidos}
          </strong>
          <small className="muted">
            {registro.idTipo === 'cedula' ? 'C.I.' : 'Pasaporte'} {registro.idNumero}
          </small>
        </div>
        <div className="cel-acciones">
          <button className="btn btn-sm" onClick={() => onEditar(registro)} title="Editar">
            ✎
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => onEliminar(registro)} title="Eliminar">
            🗑
          </button>
        </div>
      </div>
      <div className="drawer-item-meta">
        <span className="badge badge-azul">{registro.accion}</span>
        <button className="btn-link" onClick={() => onIrPagina(registro.pagina)} title="Ir a la página">
          📄 Pág. {registro.pagina}
        </button>
      </div>
      {ctx && (
        <p className="drawer-ctx">
          {expandido || !largo ? ctx : `${ctx.slice(0, 160)}… `}
          {largo && (
            <button className="btn-link" onClick={() => setExpandido((v) => !v)}>
              {expandido ? 'ver menos' : 'ver completo'}
            </button>
          )}
        </p>
      )}
    </div>
  );
}

// Panel lateral deslizante con la lista completa de personas/acciones agregadas.
export default function RegistrosDrawer({ abierto, registros, onCerrar, onEditar, onEliminar, onIrPagina }) {
  const [filtro, setFiltro] = useState('');

  // Cerrar con tecla Esc.
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abierto, onCerrar]);

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return registros;
    return registros.filter((r) =>
      `${r.nombres} ${r.apellidos} ${r.idNumero} ${r.accion} ${r.contexto}`.toLowerCase().includes(q)
    );
  }, [registros, filtro]);

  if (!abierto) return null;

  return (
    <div className="drawer-overlay" onClick={onCerrar}>
      <aside className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h3>Personas / acciones agregadas ({registros.length})</h3>
          <button className="btn btn-sm" onClick={onCerrar} title="Cerrar (Esc)">
            ✕
          </button>
        </div>
        <input
          className="drawer-filtro"
          placeholder="🔎 Filtrar por nombre, ID, acción o contexto…"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
        <div className="drawer-body">
          {filtrados.map((r) => (
            <RegistroItem
              key={r._id}
              registro={r}
              onEditar={onEditar}
              onEliminar={onEliminar}
              onIrPagina={onIrPagina}
            />
          ))}
          {filtrados.length === 0 && (
            <div className="muted centro">
              {registros.length === 0 ? 'Aún no hay personas agregadas' : 'Ninguna coincide con el filtro'}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
