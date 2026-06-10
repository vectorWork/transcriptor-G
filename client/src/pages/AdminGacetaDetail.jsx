import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import toast from 'react-hot-toast';
import { gacetasApi, registrosApi, usersApi } from '../api/client.js';
import { useLayoutPrefs } from '../hooks/useLayoutPrefs.js';
import PdfViewer from '../components/PdfViewer.jsx';
import RegistroForm from '../components/RegistroForm.jsx';
import RegistrosTable from '../components/RegistrosTable.jsx';
import GacetaHeaderEdit from '../components/GacetaHeaderEdit.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import ReasignarModal from '../components/ReasignarModal.jsx';

export default function AdminGacetaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { prefs, intercambiarLados } = useLayoutPrefs();

  const [gaceta, setGaceta] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [contextoEntrante, setContextoEntrante] = useState(null);
  const [registroEnEdicion, setRegistroEnEdicion] = useState(null);
  const [registroAEliminar, setRegistroAEliminar] = useState(null);
  const [transcriptores, setTranscriptores] = useState([]);
  const [reasignar, setReasignar] = useState(false);
  const [eliminarGaceta, setEliminarGaceta] = useState(false);

  useEffect(() => {
    gacetasApi.obtener(id).then((r) => setGaceta(r.data.gaceta)).catch(() => toast.error('No se pudo cargar la gaceta'));
    registrosApi.listar(id).then((r) => setRegistros(r.data.registros)).catch(() => {});
    usersApi
      .listar()
      .then((r) => setTranscriptores(r.data.users.filter((u) => u.role === 'transcriptor' && u.activo)))
      .catch(() => {});
  }, [id]);

  const nombresSugeridos = useMemo(
    () => [...new Set(registros.map((r) => r.nombres).filter(Boolean))],
    [registros]
  );

  const guardarRegistro = async (data) => {
    const res = await registrosApi.crear({ ...data, gacetaId: id });
    setRegistros((prev) => [res.data.registro, ...prev]);
  };
  const actualizarRegistro = async (rid, data) => {
    const res = await registrosApi.editar(rid, data);
    setRegistros((prev) => prev.map((r) => (r._id === rid ? res.data.registro : r)));
    setRegistroEnEdicion(null);
  };
  const editarRegistro = (registro) => {
    setRegistroEnEdicion(registro);
    setPagina(registro.pagina || 1);
  };
  const confirmarEliminarRegistro = async () => {
    const rid = registroAEliminar?._id;
    if (!rid) return;
    try {
      await registrosApi.eliminar(rid);
      setRegistros((prev) => prev.filter((r) => r._id !== rid));
      if (registroEnEdicion?._id === rid) setRegistroEnEdicion(null);
      toast.success('Registro eliminado');
    } catch {
      toast.error('No se pudo eliminar');
    } finally {
      setRegistroAEliminar(null);
    }
  };

  const confirmarReasignar = async (destino) => {
    try {
      const res = await gacetasApi.reasignar(id, destino);
      setGaceta(res.data.gaceta);
      setReasignar(false);
      toast.success(destino === 'cola' ? 'Devuelta a la cola' : 'Reasignada');
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo reasignar');
    }
  };

  const confirmarEliminarGaceta = async () => {
    try {
      await gacetasApi.eliminar(id);
      toast.success('Gaceta eliminada');
      navigate('/admin/gacetas');
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  if (!gaceta) return <div className="centro">Cargando gaceta…</div>;

  const panelPdf = (
    <Panel defaultSize={55} minSize={25} className="panel">
      <PdfViewer
        fileUrl={gacetasApi.fileUrl(id)}
        pagina={pagina}
        onPageChange={(p) => setPagina(p)}
        onEnviarContexto={(t) => setContextoEntrante({ texto: t, n: Date.now() })}
      />
    </Panel>
  );

  const panelForm = (
    <Panel defaultSize={45} minSize={25} className="panel">
      <div className="panel-derecho">
        <div className="cabecera-activa">
          <button className="btn btn-sm" onClick={() => navigate('/admin/gacetas')}>
            ← Volver
          </button>
          <span className={`badge ${gaceta.estado === 'finalizada' ? 'badge-verde' : 'badge-azul'}`}>
            {gaceta.estado.replace('_', ' ')}
          </span>
          <div className="cabecera-datos">
            <span className="muted">
              {gaceta.asignadoA ? `Asignada a ${gaceta.asignadoA.username}` : 'Sin asignar'} ·{' '}
              {(gaceta.paginasVistas?.length || 0)}/{gaceta.totalPaginas || 0} págs.
            </span>
          </div>
          <a className="btn btn-sm btn-accent" href={gacetasApi.exportUrl(id)} target="_blank" rel="noreferrer">
            ⬇ Excel
          </a>
          <button className="btn btn-sm" onClick={() => setReasignar(true)}>
            ↩ Devolver/Reasignar
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => setEliminarGaceta(true)}>
            🗑 Eliminar gaceta
          </button>
        </div>

        <GacetaHeaderEdit gaceta={gaceta} onActualizada={setGaceta} />

        {/* Registros primero: es lo que el admin quiere ver al abrir la gaceta */}
        <RegistrosTable
          registros={registros}
          registroEnEdicionId={registroEnEdicion?._id}
          onEditar={editarRegistro}
          onEliminar={setRegistroAEliminar}
        />

        <RegistroForm
          paginaActual={pagina}
          contextoEntrante={contextoEntrante}
          nombresSugeridos={nombresSugeridos}
          registroEnEdicion={registroEnEdicion}
          onGuardar={guardarRegistro}
          onActualizar={actualizarRegistro}
          onCancelarEdicion={() => setRegistroEnEdicion(null)}
        />
      </div>
    </Panel>
  );

  return (
    <div className="workspace">
      <div className="workspace-bar">
        <button className="btn btn-sm" onClick={intercambiarLados} title="Intercambiar lados">
          ⇄ Intercambiar lados ({prefs.pdfPrimero ? 'PDF | Registros' : 'Registros | PDF'})
        </button>
      </div>
      <PanelGroup direction="horizontal" className="panel-group">
        {prefs.pdfPrimero ? (
          <>
            {panelPdf}
            <PanelResizeHandle className="resize-handle" />
            {panelForm}
          </>
        ) : (
          <>
            {panelForm}
            <PanelResizeHandle className="resize-handle" />
            {panelPdf}
          </>
        )}
      </PanelGroup>

      <ConfirmModal
        abierto={Boolean(registroAEliminar)}
        titulo="Eliminar registro"
        mensaje={
          registroAEliminar
            ? `¿Eliminar a "${registroAEliminar.nombres} ${registroAEliminar.apellidos}" (${registroAEliminar.accion})?`
            : ''
        }
        textoConfirmar="Eliminar"
        peligro
        onConfirmar={confirmarEliminarRegistro}
        onCancelar={() => setRegistroAEliminar(null)}
      />

      <ConfirmModal
        abierto={eliminarGaceta}
        titulo="Eliminar gaceta"
        mensaje={`¿Eliminar la gaceta "${gaceta.numero || gaceta.nombreArchivo}" y todos sus registros? Esta acción no se puede deshacer.`}
        textoConfirmar="Eliminar"
        peligro
        onConfirmar={confirmarEliminarGaceta}
        onCancelar={() => setEliminarGaceta(false)}
      />

      <ReasignarModal
        abierto={reasignar}
        gaceta={gaceta}
        transcriptores={transcriptores}
        onConfirmar={confirmarReasignar}
        onCancelar={() => setReasignar(false)}
      />
    </div>
  );
}
