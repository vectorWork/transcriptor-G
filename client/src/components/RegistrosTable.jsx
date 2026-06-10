import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';

export default function RegistrosTable({ registros, registroEnEdicionId, onEditar, onEliminar }) {
  const [filtro, setFiltro] = useState('');
  const [sorting, setSorting] = useState([{ id: 'pagina', desc: false }]);

  const columns = useMemo(
    () => [
      {
        id: 'persona',
        header: 'Persona',
        accessorFn: (r) => `${r.nombres} ${r.apellidos}`,
        cell: (c) => (
          <div className="cel-persona">
            <strong>
              {c.row.original.nombres} {c.row.original.apellidos}
            </strong>
            <small className="muted">
              {c.row.original.idTipo === 'cedula' ? 'C.I.' : 'Pasaporte'} {c.row.original.idNumero}
            </small>
          </div>
        ),
      },
      { accessorKey: 'accion', header: 'Acción' },
      { accessorKey: 'pagina', header: 'Pág.', size: 50 },
      {
        id: 'acciones',
        header: '',
        cell: (c) => (
          <div className="cel-acciones">
            <button
              className="btn btn-sm"
              onClick={() => onEditar(c.row.original)}
              title="Editar"
            >
              ✎
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => onEliminar(c.row.original)}
              title="Eliminar"
            >
              🗑
            </button>
          </div>
        ),
      },
    ],
    [onEditar, onEliminar]
  );

  const table = useReactTable({
    data: registros,
    columns,
    state: { globalFilter: filtro, sorting },
    onGlobalFilterChange: setFiltro,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="tabla-wrap">
      <div className="tabla-head">
        <strong>Nombres agregados ({registros.length})</strong>
        <input
          className="filtro-input"
          placeholder="Filtrar por nombre, acción…"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>
      <div className="tabla-scroll">
        <table className="tabla tabla-registros">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} onClick={h.column.getToggleSortingHandler()}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {{ asc: ' ▲', desc: ' ▼' }[h.column.getIsSorted()] || ''}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                title={row.original.contexto}
                className={row.original._id === registroEnEdicionId ? 'fila-activa' : ''}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
            {registros.length === 0 && (
              <tr>
                <td colSpan={4} className="muted centro">
                  Aún no has agregado nombres en esta gaceta
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
