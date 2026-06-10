import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { gacetasApi, usersApi } from '../api/client.js';
import ReasignarModal from '../components/ReasignarModal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

const ESTADOS = [
  { value: '', label: 'Todas' },
  { value: 'en_cola', label: 'En cola' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'finalizada', label: 'Finalizadas' },
];

const badgeEstado = {
  en_cola: 'badge-azul',
  en_proceso: 'badge-azul',
  finalizada: 'badge-verde',
};

export default function AdminGacetas() {
  const [gacetas, setGacetas] = useState([]);
  const [estado, setEstado] = useState('');
  const [transcriptores, setTranscriptores] = useState([]);
  const [reasignar, setReasignar] = useState(null);
  const [eliminar, setEliminar] = useState(null);

  const cargar = useCallback(() => {
    const params = estado ? { estado } : {};
    gacetasApi.listar(params).then((r) => setGacetas(r.data.gacetas)).catch(() => {});
  }, [estado]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    usersApi
      .listar()
      .then((r) => setTranscriptores(r.data.users.filter((u) => u.role === 'transcriptor' && u.activo)))
      .catch(() => {});
  }, []);

  const confirmarReasignar = async (destino) => {
    try {
      await gacetasApi.reasignar(reasignar._id, destino);
      toast.success(destino === 'cola' ? 'Devuelta a la cola' : 'Reasignada');
      setReasignar(null);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo reasignar');
    }
  };

  const confirmarEliminar = async () => {
    try {
      await gacetasApi.eliminar(eliminar._id);
      toast.success('Gaceta eliminada');
      setEliminar(null);
      cargar();
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  return (
    <div className="pagina">
      <h2>Gacetas</h2>

      <div className="filtros-bar">
        {ESTADOS.map((e) => (
          <button
            key={e.value}
            className={`btn btn-sm ${estado === e.value ? 'btn-primary' : ''}`}
            onClick={() => setEstado(e.value)}
          >
            {e.label}
          </button>
        ))}
      </div>

      <table className="tabla">
        <thead>
          <tr>
            <th>Nº / Archivo</th>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Estado</th>
            <th>Asignado a</th>
            <th>Progreso</th>
            <th>Registros</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {gacetas.map((g) => (
            <tr key={g._id}>
              <td>
                <Link to={`/admin/gacetas/${g._id}`}>{g.numero || g.nombreArchivo}</Link>
              </td>
              <td>{g.fecha ? new Date(g.fecha).toLocaleDateString() : '—'}</td>
              <td>{g.tipo || '—'}</td>
              <td>
                <span className={`badge ${badgeEstado[g.estado] || ''}`}>
                  {g.estado.replace('_', ' ')}
                </span>
              </td>
              <td>{g.asignadoA ? `${g.asignadoA.nombre} (${g.asignadoA.username})` : '—'}</td>
              <td>
                {(g.paginasVistas?.length || 0)}/{g.totalPaginas || 0}
              </td>
              <td>{g.totalRegistros || 0}</td>
              <td>
                <div className="cel-acciones">
                  <Link className="btn btn-sm" to={`/admin/gacetas/${g._id}`}>
                    Ver
                  </Link>
                  <button className="btn btn-sm" onClick={() => setReasignar(g)}>
                    Devolver
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => setEliminar(g)}>
                    🗑
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {gacetas.length === 0 && (
            <tr>
              <td colSpan={8} className="muted centro">
                No hay gacetas en este estado
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <ReasignarModal
        abierto={Boolean(reasignar)}
        gaceta={reasignar}
        transcriptores={transcriptores}
        onConfirmar={confirmarReasignar}
        onCancelar={() => setReasignar(null)}
      />

      <ConfirmModal
        abierto={Boolean(eliminar)}
        titulo="Eliminar gaceta"
        mensaje={
          eliminar
            ? `¿Eliminar la gaceta "${eliminar.numero || eliminar.nombreArchivo}" y todos sus registros? Esta acción no se puede deshacer.`
            : ''
        }
        textoConfirmar="Eliminar"
        peligro
        onConfirmar={confirmarEliminar}
        onCancelar={() => setEliminar(null)}
      />
    </div>
  );
}
