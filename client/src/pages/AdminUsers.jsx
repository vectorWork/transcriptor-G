import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { usersApi } from '../api/client.js';
import ConfirmModal from '../components/ConfirmModal.jsx';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ nombre: '', username: '', password: '', role: 'transcriptor' });
  const [creando, setCreando] = useState(false);
  const [usuarioADesactivar, setUsuarioADesactivar] = useState(null);

  const cargar = () => usersApi.listar().then((r) => setUsers(r.data.users)).catch(() => {});
  useEffect(() => {
    cargar();
  }, []);

  const crear = async (e) => {
    e.preventDefault();
    setCreando(true);
    try {
      await usersApi.crear(form);
      toast.success('Usuario creado');
      setForm({ nombre: '', username: '', password: '', role: 'transcriptor' });
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo crear');
    } finally {
      setCreando(false);
    }
  };

  const cambiarActivo = async (u, activo) => {
    try {
      await usersApi.actualizar(u.id, { activo });
      cargar();
    } catch {
      toast.error('No se pudo actualizar');
    }
  };

  // Al desactivar se pide confirmación; al reactivar es directo.
  const alternarActivo = (u) => {
    if (u.activo) setUsuarioADesactivar(u);
    else cambiarActivo(u, true);
  };

  const confirmarDesactivar = async () => {
    if (usuarioADesactivar) await cambiarActivo(usuarioADesactivar, false);
    setUsuarioADesactivar(null);
  };

  return (
    <div className="pagina">
      <h2>Gestión de usuarios</h2>
      <form className="card-form" onSubmit={crear}>
        <h3>Crear usuario</h3>
        <div className="campo-fila">
          <label className="campo">
            Nombre
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          </label>
          <label className="campo">
            Usuario
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </label>
        </div>
        <div className="campo-fila">
          <label className="campo">
            Contraseña
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </label>
          <label className="campo campo-corto">
            Rol
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="transcriptor">Transcriptor</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
        </div>
        <button className="btn btn-primary" disabled={creando} type="submit">
          {creando ? 'Creando…' : 'Crear usuario'}
        </button>
      </form>

      <table className="tabla">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Último ingreso</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.nombre}</td>
              <td>{u.username}</td>
              <td>{u.role}</td>
              <td>{u.activo ? '🟢 Activo' : '🔴 Inactivo'}</td>
              <td>{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '—'}</td>
              <td>
                <button className="btn btn-sm" onClick={() => alternarActivo(u)}>
                  {u.activo ? 'Desactivar' : 'Activar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmModal
        abierto={Boolean(usuarioADesactivar)}
        titulo="Desactivar usuario"
        mensaje={
          usuarioADesactivar
            ? `¿Desactivar a "${usuarioADesactivar.nombre}" (${usuarioADesactivar.username})? No podrá iniciar sesión hasta que lo reactives.`
            : ''
        }
        textoConfirmar="Desactivar"
        peligro
        onConfirmar={confirmarDesactivar}
        onCancelar={() => setUsuarioADesactivar(null)}
      />
    </div>
  );
}
