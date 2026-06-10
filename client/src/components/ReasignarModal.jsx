import { useEffect, useState } from 'react';

// Modal para devolver una gaceta a la cola general o asignarla a un transcriptor.
export default function ReasignarModal({ abierto, gaceta, transcriptores, onConfirmar, onCancelar }) {
  const [destino, setDestino] = useState('cola');

  useEffect(() => {
    if (abierto) setDestino('cola');
  }, [abierto, gaceta?._id]);

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e) => e.key === 'Escape' && onCancelar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abierto, onCancelar]);

  if (!abierto) return null;

  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="modal-titulo">Devolver / reasignar gaceta</h3>
        <p className="modal-mensaje">
          Gaceta <strong>Nº {gaceta?.numero || gaceta?.nombreArchivo}</strong>. Se conservan los
          registros y el progreso de lectura.
        </p>
        <label className="campo">
          Asignar a
          <select value={destino} onChange={(e) => setDestino(e.target.value)}>
            <option value="cola">Cola general (la toma el siguiente libre)</option>
            <optgroup label="Transcriptor">
              {transcriptores.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} ({u.username})
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <div className="modal-acciones">
          <button className="btn" onClick={onCancelar}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={() => onConfirmar(destino)}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
