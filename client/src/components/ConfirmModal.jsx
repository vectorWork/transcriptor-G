import { useEffect } from 'react';

// Modal de confirmación reutilizable. Se muestra cuando `abierto` es true.
export default function ConfirmModal({
  abierto,
  titulo = '¿Confirmar?',
  mensaje,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  peligro = false,
  onConfirmar,
  onCancelar,
}) {
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
        <h3 className="modal-titulo">{titulo}</h3>
        {mensaje && <p className="modal-mensaje">{mensaje}</p>}
        <div className="modal-acciones">
          <button className="btn" onClick={onCancelar} autoFocus>
            {textoCancelar}
          </button>
          <button
            className={`btn ${peligro ? 'btn-peligro' : 'btn-primary'}`}
            onClick={onConfirmar}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
