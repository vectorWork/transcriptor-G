import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { gacetasApi } from '../api/client.js';

function aFecha(d) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

// Cabecera editable de la gaceta: número, fecha y tipo (vienen vacíos del script).
export default function GacetaHeaderEdit({ gaceta, onActualizada }) {
  const [editando, setEditando] = useState(false);
  const [numero, setNumero] = useState(gaceta.numero || '');
  const [fecha, setFecha] = useState(aFecha(gaceta.fecha));
  const [tipo, setTipo] = useState(gaceta.tipo || '');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setNumero(gaceta.numero || '');
    setFecha(aFecha(gaceta.fecha));
    setTipo(gaceta.tipo || '');
    setEditando(false);
  }, [gaceta._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const guardar = async () => {
    setGuardando(true);
    try {
      const res = await gacetasApi.editarMetadatos(gaceta._id, {
        numero,
        fecha: fecha || null,
        tipo: tipo || null,
      });
      toast.success('Datos de la gaceta actualizados');
      onActualizada?.(res.data.gaceta);
      setEditando(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo actualizar');
    } finally {
      setGuardando(false);
    }
  };

  const faltanDatos = !gaceta.fecha || !gaceta.tipo;

  if (!editando) {
    return (
      <div className="gaceta-header">
        <div className="gaceta-header-datos">
          <strong>Nº {gaceta.numero || '—'}</strong>
          <span className="muted">
            {gaceta.fecha ? new Date(gaceta.fecha).toLocaleDateString() : 'sin fecha'} ·{' '}
            {gaceta.tipo || 'sin tipo'}
          </span>
          {faltanDatos && <span className="badge badge-rojo">Faltan datos</span>}
        </div>
        <button className="btn btn-sm" onClick={() => setEditando(true)}>
          ✎ Editar datos
        </button>
      </div>
    );
  }

  return (
    <div className="gaceta-header editando-header">
      <div className="campo-fila">
        <label className="campo">
          Gaceta (Nº)
          <input value={numero} onChange={(e) => setNumero(e.target.value)} />
        </label>
        <label className="campo">
          Fecha
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <label className="campo campo-corto">
          Tipo
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">— sin tipo —</option>
            <option value="ordinaria">Ordinaria</option>
            <option value="extraordinaria">Extraordinaria</option>
          </select>
        </label>
      </div>
      <div className="form-acciones">
        <button className="btn btn-sm" onClick={() => setEditando(false)}>
          Cancelar
        </button>
        <button className="btn btn-sm btn-primary" onClick={guardar} disabled={guardando}>
          Guardar datos
        </button>
      </div>
    </div>
  );
}
