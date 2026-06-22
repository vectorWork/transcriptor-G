import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ACCIONES, PREFIJOS_ID, validarIdentificacion } from '../utils/constants.js';
import { registrosApi } from '../api/client.js';

const VACIO = {
  idPrefijo: 'V',
  idNumero: '',
  nombres: '',
  apellidos: '',
  accion: '',
  pagina: 1,
  contexto: '',
};

// Separa el prefijo y el número de un registro existente. Tolera datos viejos
// donde el prefijo venía embebido en idNumero ("V12345678") y aún no se migró.
function descomponerId(registro) {
  if (registro.idPrefijo) return { idPrefijo: registro.idPrefijo, idNumero: registro.idNumero || '' };
  const raw = (registro.idNumero || '').trim();
  const m = raw.match(new RegExp(`^(${PREFIJOS_ID.join('|')})-?(\\d{5,})$`, 'i'));
  if (m) return { idPrefijo: m[1].toUpperCase(), idNumero: m[2] };
  return { idPrefijo: 'V', idNumero: raw };
}

export default function RegistroForm({
  paginaActual,
  contextoEntrante,
  nombresSugeridos = [],
  registroEnEdicion = null,
  onGuardar,
  onActualizar,
  onCancelarEdicion,
}) {
  const editando = Boolean(registroEnEdicion);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { ...VACIO, pagina: paginaActual || 1 } });

  // Carga el registro a editar (o limpia al salir del modo edición).
  useEffect(() => {
    if (registroEnEdicion) {
      const { idPrefijo, idNumero } = descomponerId(registroEnEdicion);
      reset({
        idPrefijo,
        idNumero,
        nombres: registroEnEdicion.nombres,
        apellidos: registroEnEdicion.apellidos,
        accion: registroEnEdicion.accion,
        pagina: registroEnEdicion.pagina,
        contexto: registroEnEdicion.contexto || '',
      });
    } else {
      reset({ ...VACIO, pagina: paginaActual || 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registroEnEdicion]);

  // Sincroniza la página con la del visor solo al capturar (no al editar).
  useEffect(() => {
    if (!editando && paginaActual) setValue('pagina', paginaActual);
  }, [paginaActual, editando, setValue]);

  // Anexa el texto que llega desde el visor (selección) al contexto.
  useEffect(() => {
    if (!contextoEntrante?.texto) return;
    const actual = getValues('contexto');
    const nuevo = actual ? `${actual}\n${contextoEntrante.texto}` : contextoEntrante.texto;
    setValue('contexto', nuevo, { shouldDirty: true });
  }, [contextoEntrante, getValues, setValue]);

  const idPrefijo = watch('idPrefijo');
  const idNumero = watch('idNumero');

  // Autocompleta nombres/apellidos cuando la identificación (prefijo + número)
  // coincide en su totalidad con una persona ya registrada en cualquier gaceta.
  // No toca página, acción ni contexto: esos son propios de cada registro.
  const ultimaBuscada = useRef('');
  useEffect(() => {
    if (editando) return; // en edición no autocompletamos
    const valor = (idNumero || '').trim();
    if (validarIdentificacion(idPrefijo, valor)) return; // aún no es un ID válido
    const clave = `${idPrefijo}-${valor}`;
    if (clave === ultimaBuscada.current) return; // ya buscado
    const t = setTimeout(async () => {
      try {
        const { data } = await registrosApi.buscarPorId(idPrefijo, valor);
        ultimaBuscada.current = clave;
        const r = data.registro;
        if (!r) return;
        setValue('nombres', r.nombres, { shouldDirty: true });
        setValue('apellidos', r.apellidos, { shouldDirty: true });
        toast.success(`Datos autocompletados: ${r.nombres} ${r.apellidos}`);
      } catch {
        /* silencioso: el autocompletado es una ayuda, no debe molestar */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [idPrefijo, idNumero, editando, setValue]);

  const submit = async (data) => {
    const errId = validarIdentificacion(data.idPrefijo, data.idNumero);
    if (errId) {
      toast.error(errId);
      return;
    }
    try {
      if (editando) {
        await onActualizar(registroEnEdicion._id, data);
        toast.success('Registro actualizado');
      } else {
        await onGuardar(data);
        toast.success('Registro guardado');
        reset({ ...VACIO, idPrefijo: data.idPrefijo, pagina: data.pagina });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo guardar');
    }
  };

  const onKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(submit)();
    }
  };

  return (
    <form
      className={`registro-form${editando ? ' editando' : ''}`}
      onSubmit={handleSubmit(submit)}
      onKeyDown={onKeyDown}
    >
      <h3>{editando ? '✎ Editar registro' : 'Nueva persona / acción'}</h3>

      <div className="campo-fila">
        <label className="campo">
          Cédula / Identificación
          <div className="id-grupo">
            <select className="id-prefijo" {...register('idPrefijo')}>
              {PREFIJOS_ID.map((p) => (
                <option key={p} value={p}>
                  {p}-
                </option>
              ))}
            </select>
            <input
              className="id-numero"
              {...register('idNumero', { required: 'Requerido' })}
              placeholder={idPrefijo === 'P' ? 'AB123456' : '12345678'}
              inputMode={idPrefijo === 'P' ? 'text' : 'numeric'}
              autoComplete="off"
            />
          </div>
          {errors.idNumero && <span className="err">{errors.idNumero.message}</span>}
        </label>
      </div>

      <div className="campo-fila">
        <label className="campo">
          Nombres
          <input list="lista-nombres" {...register('nombres', { required: 'Requerido' })} />
          {errors.nombres && <span className="err">{errors.nombres.message}</span>}
        </label>
        <label className="campo">
          Apellidos
          <input {...register('apellidos', { required: 'Requerido' })} />
          {errors.apellidos && <span className="err">{errors.apellidos.message}</span>}
        </label>
      </div>
      <datalist id="lista-nombres">
        {nombresSugeridos.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      <div className="campo-fila">
        <label className="campo">
          Acción
          <select {...register('accion', { required: 'Selecciona una acción' })}>
            <option value="">— Selecciona —</option>
            {ACCIONES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          {errors.accion && <span className="err">{errors.accion.message}</span>}
        </label>
        <label className="campo campo-corto">
          Página
          <input type="number" min={1} {...register('pagina', { valueAsNumber: true, min: 1 })} />
        </label>
      </div>

      <label className="campo">
        Contexto
        <textarea rows={5} {...register('contexto')} placeholder="Texto de referencia del PDF…" />
      </label>

      <div className="form-acciones">
        {editando ? (
          <>
            <button type="button" className="btn" onClick={onCancelarEdicion}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} title="Ctrl+Enter">
              Actualizar
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn"
              onClick={() => reset({ ...VACIO, pagina: paginaActual })}
            >
              Limpiar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} title="Ctrl+Enter">
              Guardar y siguiente
            </button>
          </>
        )}
      </div>
      {!editando && <p className="muted atajo">Atajo: Ctrl + Enter para guardar</p>}
    </form>
  );
}
