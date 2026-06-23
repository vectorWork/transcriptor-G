import { useEffect, useState, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import toast from 'react-hot-toast';
import { gacetasApi, registrosApi } from '../api/client.js';
import { useLayoutPrefs } from '../hooks/useLayoutPrefs.js';
import PdfViewer from '../components/PdfViewer.jsx';
import RegistroForm from '../components/RegistroForm.jsx';
import RegistrosTable from '../components/RegistrosTable.jsx';
import RegistrosDrawer from '../components/RegistrosDrawer.jsx';
import GacetaHeaderEdit from '../components/GacetaHeaderEdit.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

export default function Workspace() {
  const { prefs, intercambiarLados } = useLayoutPrefs();
  const [gaceta, setGaceta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [registros, setRegistros] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [paginasVistas, setPaginasVistas] = useState(new Set());
  const [todasVistas, setTodasVistas] = useState(false);
  const [contextoEntrante, setContextoEntrante] = useState(null);
  const [registroEnEdicion, setRegistroEnEdicion] = useState(null);
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [registroAEliminar, setRegistroAEliminar] = useState(null);
  const [confirmarFinalizar, setConfirmarFinalizar] = useState(false);

  // Carga la gaceta activa (o la siguiente de la cola) y sus registros.
  const cargarActual = useCallback(async (g) => {
    let gact = g;
    let paginaGuardada = null;
    if (!g) {
      const res = await gacetasApi.actual();
      gact = res.data.gaceta;
      paginaGuardada = res.data.paginaGuardada;
    }
    setGaceta(gact);
    setRegistroEnEdicion(null);
    if (gact) {
      // Restaura la página guardada (marcador) si es válida; si no, página 1.
      const inicial = paginaGuardada && paginaGuardada <= gact.totalPaginas ? paginaGuardada : 1;
      setPagina(inicial);
      const vistas = new Set(gact.paginasVistas || []);
      setPaginasVistas(vistas);
      setTodasVistas(gact.totalPaginas > 0 && vistas.size >= gact.totalPaginas);
      const r = await registrosApi.listar(gact._id);
      setRegistros(r.data.registros);
    } else {
      setPagina(1);
      setRegistros([]);
      setPaginasVistas(new Set());
      setTodasVistas(false);
    }
  }, []);

  useEffect(() => {
    cargarActual()
      .catch(() => toast.error('No se pudo cargar tu gaceta'))
      .finally(() => setCargando(false));
  }, [cargarActual]);

  // La navegación solo cambia la página; el marcado lo hace el efecto de abajo.
  const onPageChange = useCallback((p) => setPagina(p), []);

  // Marca automáticamente la página actual como vista (incluida la inicial al
  // cargar la gaceta). Antes solo se marcaba al navegar, por lo que la primera
  // página nunca se contaba y "Finalizar" no llegaba a habilitarse (p.ej. 23/24).
  useEffect(() => {
    if (!gaceta || !pagina || paginasVistas.has(pagina)) return;
    let cancelado = false;
    gacetasApi
      .marcarVisto(gaceta._id, pagina)
      .then((res) => {
        if (cancelado) return;
        setPaginasVistas(new Set(res.data.paginasVistas));
        setTodasVistas(res.data.todasVistas);
      })
      .catch(() => {
        /* no bloquear la navegación si falla el marcado */
      });
    return () => {
      cancelado = true;
    };
  }, [gaceta, pagina, paginasVistas]);

  const guardarRegistro = async (data) => {
    const res = await registrosApi.crear({ ...data, gacetaId: gaceta._id });
    setRegistros((prev) => [res.data.registro, ...prev]);
  };

  const actualizarRegistro = async (id, data) => {
    const res = await registrosApi.editar(id, data);
    setRegistros((prev) => prev.map((r) => (r._id === id ? res.data.registro : r)));
    setRegistroEnEdicion(null);
  };

  const editarRegistro = (registro) => {
    setRegistroEnEdicion(registro);
    setPagina(registro.pagina || 1);
    setDrawerAbierto(false);
  };

  const confirmarEliminarRegistro = async () => {
    const id = registroAEliminar?._id;
    if (!id) return;
    try {
      await registrosApi.eliminar(id);
      setRegistros((prev) => prev.filter((r) => r._id !== id));
      if (registroEnEdicion?._id === id) setRegistroEnEdicion(null);
      toast.success('Registro eliminado');
    } catch {
      toast.error('No se pudo eliminar');
    } finally {
      setRegistroAEliminar(null);
    }
  };

  const irPagina = (p) => {
    onPageChange(p);
    setDrawerAbierto(false);
  };

  const enviarContexto = (texto) => setContextoEntrante({ texto, n: Date.now() });

  const guardarPagina = async () => {
    try {
      await gacetasApi.guardarMarcador(gaceta._id, pagina);
      toast.success(`Página ${pagina} guardada como marcador`);
    } catch {
      toast.error('No se pudo guardar la página');
    }
  };

  const finalizar = async () => {
    try {
      const res = await gacetasApi.finalizar(gaceta._id);
      setConfirmarFinalizar(false);
      toast.success('Transcripción finalizada');
      await cargarActual(res.data.siguiente); // carga la siguiente de la cola (o vacío)
    } catch (err) {
      setConfirmarFinalizar(false);
      toast.error(err.response?.data?.error || 'No se pudo finalizar');
    }
  };

  if (cargando) return <div className="centro">Cargando tu gaceta…</div>;

  // Sin gaceta asignada ni en cola
  if (!gaceta) {
    return (
      <div className="workspace">
        <div className="vacio-cola">
          <h2>🎉 No hay gacetas en cola</h2>
          <p className="muted">
            No tienes ninguna gaceta asignada en este momento. Cuando el administrador cargue nuevas
            gacetas, se te asignará la siguiente automáticamente.
          </p>
          <button className="btn" onClick={() => cargarActual()}>
            ↻ Revisar de nuevo
          </button>
        </div>
      </div>
    );
  }

  const progreso = `${paginasVistas.size}/${gaceta.totalPaginas || 0}`;

  const panelPdf = (
    <Panel defaultSize={55} minSize={25} className="panel">
      <PdfViewer
        fileUrl={gacetasApi.fileUrl(gaceta._id)}
        pagina={pagina}
        onPageChange={onPageChange}
        onEnviarContexto={enviarContexto}
      />
    </Panel>
  );

  const panelForm = (
    <Panel defaultSize={45} minSize={25} className="panel">
      <div className="panel-derecho">
        <GacetaHeaderEdit gaceta={gaceta} onActualizada={setGaceta} />

        <div className="progreso-bar">
          <span>
            📖 Páginas leídas: <strong>{progreso}</strong>
          </span>
          <button className="btn btn-sm" onClick={guardarPagina} title={`Guardar que vas por la página ${pagina}`}>
            💾 Guardar página {pagina}
          </button>
          <button className="btn btn-sm" onClick={() => setDrawerAbierto(true)}>
            👥 Ver personas ({registros.length})
          </button>
          <button
            className="btn btn-sm btn-accent"
            onClick={() => setConfirmarFinalizar(true)}
            disabled={!todasVistas}
            title={todasVistas ? 'Finalizar transcripción' : 'Debes leer todas las páginas'}
          >
            ✓ Finalizar transcripción
          </button>
        </div>

        <RegistroForm
          paginaActual={pagina}
          contextoEntrante={contextoEntrante}
          registroEnEdicion={registroEnEdicion}
          onGuardar={guardarRegistro}
          onActualizar={actualizarRegistro}
          onCancelarEdicion={() => setRegistroEnEdicion(null)}
        />

        <RegistrosTable
          registros={registros}
          registroEnEdicionId={registroEnEdicion?._id}
          onEditar={editarRegistro}
          onEliminar={setRegistroAEliminar}
        />
      </div>
    </Panel>
  );

  return (
    <div className="workspace">
      <div className="workspace-bar">
        <button className="btn btn-sm" onClick={intercambiarLados} title="Intercambiar lados">
          ⇄ Intercambiar lados ({prefs.pdfPrimero ? 'PDF | Formulario' : 'Formulario | PDF'})
        </button>
        {!todasVistas && (
          <span className="aviso-lectura muted">
            Lee todas las páginas para habilitar “Finalizar”.
          </span>
        )}
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

      <RegistrosDrawer
        abierto={drawerAbierto}
        registros={registros}
        onCerrar={() => setDrawerAbierto(false)}
        onEditar={editarRegistro}
        onEliminar={setRegistroAEliminar}
        onIrPagina={irPagina}
      />

      <ConfirmModal
        abierto={Boolean(registroAEliminar)}
        titulo="Eliminar registro"
        mensaje={
          registroAEliminar
            ? `¿Eliminar a "${registroAEliminar.nombres} ${registroAEliminar.apellidos}" (${registroAEliminar.accion})? Esta acción no se puede deshacer.`
            : ''
        }
        textoConfirmar="Eliminar"
        peligro
        onConfirmar={confirmarEliminarRegistro}
        onCancelar={() => setRegistroAEliminar(null)}
      />

      <ConfirmModal
        abierto={confirmarFinalizar}
        titulo="Finalizar transcripción"
        mensaje={`Vas a finalizar la gaceta "${gaceta.numero}". No podrás volver a acceder a ella y se te asignará la siguiente de la cola. ¿Continuar?`}
        textoConfirmar="Finalizar"
        onConfirmar={finalizar}
        onCancelar={() => setConfirmarFinalizar(false)}
      />
    </div>
  );
}
