import { useEffect, useState } from 'react';
import { statsApi, usersApi } from '../api/client.js';

function fmtTiempo(ms) {
  if (!ms) return '—';
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${min % 60} min`;
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [transcriptores, setTranscriptores] = useState([]);
  const [filtros, setFiltros] = useState({ userId: '', desde: '', hasta: '' });

  useEffect(() => {
    usersApi
      .listar()
      .then((r) => setTranscriptores(r.data.users.filter((u) => u.role === 'transcriptor')))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = {};
    if (filtros.userId) params.userId = filtros.userId;
    if (filtros.desde) params.desde = filtros.desde;
    if (filtros.hasta) params.hasta = filtros.hasta;
    statsApi.dashboard(params).then((r) => setData(r.data)).catch(() => {});
  }, [filtros]);

  const limpiar = () => setFiltros({ userId: '', desde: '', hasta: '' });
  const hayFiltros = filtros.userId || filtros.desde || filtros.hasta;

  return (
    <div className="pagina">
      <h2>Panel del administrador</h2>

      <div className="filtros-bar">
        <label className="filtro-mini">
          Transcriptor
          <select
            value={filtros.userId}
            onChange={(e) => setFiltros({ ...filtros, userId: e.target.value })}
          >
            <option value="">Todos</option>
            {transcriptores.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre} ({u.username})
              </option>
            ))}
          </select>
        </label>
        <label className="filtro-mini">
          Desde
          <input
            type="date"
            value={filtros.desde}
            onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })}
          />
        </label>
        <label className="filtro-mini">
          Hasta
          <input
            type="date"
            value={filtros.hasta}
            onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })}
          />
        </label>
        {hayFiltros && (
          <button className="btn btn-sm" onClick={limpiar}>
            Limpiar filtros
          </button>
        )}
      </div>

      {!data ? (
        <p className="muted">Cargando métricas…</p>
      ) : (
        <>
          {/* Estado de la cola */}
          <div className="cards-stats">
            <div className="stat-card">
              <span className="stat-num">{data.cola.en_cola}</span>
              <span className="stat-label">En cola</span>
            </div>
            <div className="stat-card">
              <span className="stat-num">{data.cola.en_proceso}</span>
              <span className="stat-label">En proceso</span>
            </div>
            <div className="stat-card">
              <span className="stat-num">{data.cola.finalizada}</span>
              <span className="stat-label">Finalizadas</span>
            </div>
          </div>

          {/* Quién trabaja qué ahora */}
          <h3>En proceso ahora mismo</h3>
          <table className="tabla">
            <thead>
              <tr>
                <th>Transcriptor</th>
                <th>Gaceta</th>
                <th>Progreso</th>
                <th>Desde</th>
              </tr>
            </thead>
            <tbody>
              {data.enProceso.map((g) => (
                <tr key={g.id}>
                  <td>{g.asignadoA ? `${g.asignadoA.nombre} (${g.asignadoA.username})` : '—'}</td>
                  <td>Nº {g.numero || g.nombreArchivo}</td>
                  <td>{g.progreso} págs.</td>
                  <td>{g.startedAt ? new Date(g.startedAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
              {data.enProceso.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted centro">
                    Nadie tiene gacetas en proceso
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Procesadas por usuario + productividad */}
          <h3>Por transcriptor</h3>
          <table className="tabla">
            <thead>
              <tr>
                <th>Transcriptor</th>
                <th>Finalizadas</th>
                <th>Registros capturados</th>
                <th>Tiempo prom. / gaceta</th>
              </tr>
            </thead>
            <tbody>
              {data.porUsuario.map((u) => (
                <tr key={u.userId}>
                  <td>
                    {u.nombre} <span className="muted">({u.username})</span>
                  </td>
                  <td>{u.finalizadas}</td>
                  <td>{u.registros}</td>
                  <td>{fmtTiempo(u.tiempoPromedioMs)}</td>
                </tr>
              ))}
              {data.porUsuario.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted centro">
                    Sin datos
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Por mes */}
          <h3>Finalizadas por mes</h3>
          <table className="tabla">
            <thead>
              <tr>
                <th>Mes</th>
                <th>Finalizadas</th>
              </tr>
            </thead>
            <tbody>
              {data.porMes.map((m) => (
                <tr key={m.mes}>
                  <td>{m.mes}</td>
                  <td>{m.total}</td>
                </tr>
              ))}
              {data.porMes.length === 0 && (
                <tr>
                  <td colSpan={2} className="muted centro">
                    Sin datos en el periodo
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
