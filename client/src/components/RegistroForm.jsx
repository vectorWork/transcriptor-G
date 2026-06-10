import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ACCIONES, validarIdentificacion } from '../utils/constants.js';

const VACIO = {
  nombres: '',
  apellidos: '',
  idTipo: 'cedula',
  idNumero: '',
  accion: '',
  pagina: 1,
  contexto: '',
};

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
      reset({
        nombres: registroEnEdicion.nombres,
        apellidos: registroEnEdicion.apellidos,
        idTipo: registroEnEdicion.idTipo,
        idNumero: registroEnEdicion.idNumero,
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

  const idTipo = watch('idTipo');

  const submit = async (data) => {
    const errId = validarIdentificacion(data.idTipo, data.idNumero);
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
        reset({ ...VACIO, idTipo: data.idTipo, pagina: data.pagina });
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
        <label className="campo campo-corto">
          Tipo de ID
          <select {...register('idTipo')}>
            <option value="cedula">Cédula</option>
            <option value="pasaporte">Pasaporte</option>
          </select>
        </label>
        <label className="campo">
          {idTipo === 'cedula' ? 'Cédula' : 'Pasaporte'}
          <input
            {...register('idNumero', { required: 'Requerido' })}
            placeholder={idTipo === 'cedula' ? 'V12345678' : 'AB123456'}
          />
          {errors.idNumero && <span className="err">{errors.idNumero.message}</span>}
        </label>
      </div>

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
