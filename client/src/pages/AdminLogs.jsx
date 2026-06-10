import { useEffect, useState } from 'react';
import { logsApi } from '../api/client.js';

const ACCIONES_LOG = [
  'LOGIN',
  'LOGOUT',
  'LOGIN_FALLIDO',
  'CREAR_USUARIO',
  'ACTUALIZAR_USUARIO',
  'SUBIR_GACETA',
  'FINALIZAR_GACETA',
  'REASIGNAR_GACETA',
  'VER_PDF',
  'CREAR_REGISTRO',
  'EDITAR_REGISTRO',
  'ELIMINAR_REGISTRO',
  'EXPORTAR',
];

export default function AdminLogs() {
  const [data, setData] = useState({ logs: [], total: 0, page: 1, pages: 1 });
  const [filtros, setFiltros] = useState({ accion: '', username: '', page: 1 });

  const cargar = () => {
    const params = { page: filtros.page, limit: 25 };
    if (filtros.accion) params.accion = filtros.accion;
    if (filtros.username) params.username = filtros.username;
    logsApi.listar(params).then((r) => setData(r.data)).catch(() => {});
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);

  return (
    <div className="pagina">
      <h2>Bitácora de auditoría</h2>
      <div className="filtros-bar">
        <select
          value={filtros.accion}
          onChange={(e) => setFiltros({ ...filtros, accion: e.target.value, page: 1 })}
        >
          <option value="">Todas las acciones</option>
          {ACCIONES_LOG.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <input
          placeholder="Filtrar por usuario…"
          value={filtros.username}
          onChange={(e) => setFiltros({ ...filtros, username: e.target.value, page: 1 })}
        />
      </div>

      <table className="tabla">
        <thead>
          <tr>
            <th>Fecha/Hora</th>
            <th>Usuario</th>
            <th>Acción</th>
            <th>Detalle</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          {data.logs.map((l) => (
            <tr key={l._id}>
              <td>{new Date(l.timestamp).toLocaleString()}</td>
              <td>{l.username}</td>
              <td>
                <span className={`badge badge-${l.accion.toLowerCase().includes('fallido') ? 'rojo' : 'azul'}`}>
                  {l.accion}
                </span>
              </td>
              <td>{l.detalle || '—'}</td>
              <td className="muted">{l.ip || '—'}</td>
            </tr>
          ))}
          {data.logs.length === 0 && (
            <tr>
              <td colSpan={5} className="muted centro">
                Sin eventos
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="paginacion">
        <button
          className="btn btn-sm"
          disabled={data.page <= 1}
          onClick={() => setFiltros({ ...filtros, page: filtros.page - 1 })}
        >
          ◀ Anterior
        </button>
        <span>
          Página {data.page} de {data.pages || 1}
        </span>
        <button
          className="btn btn-sm"
          disabled={data.page >= data.pages}
          onClick={() => setFiltros({ ...filtros, page: filtros.page + 1 })}
        >
          Siguiente ▶
        </button>
      </div>
    </div>
  );
}
