export const ACCIONES = [
  'Nombramiento',
  'Designacion',
  'Reemplazo (e/r)',
  'Constitucion (integrantes de)',
  'Actuacion',
  'Otorgamiento',
  'Delegacion',
  'Inhabilitacion',
  'Mencion',
];

// Prefijos de nomenclatura de la identificación (RIF/cédula venezolana).
export const PREFIJOS_ID = ['V', 'E', 'J', 'C', 'G', 'P'];

const NUMERO_RE = /^\d{6,10}$/; // cédula / RIF (V, E, J, C, G)
const PASAPORTE_RE = /^[A-Za-z0-9]{5,15}$/; // pasaporte (P)

// El tipo "legacy" (cedula/pasaporte) se deriva del prefijo.
export function idTipoDesdePrefijo(idPrefijo) {
  return idPrefijo === 'P' ? 'pasaporte' : 'cedula';
}

// Representación combinada para mostrar/exportar: "V-12345678".
export function formatearId(idPrefijo, idNumero) {
  return idPrefijo ? `${idPrefijo}-${idNumero}` : idNumero || '';
}

// Misma lógica que el backend (server/src/utils/validators.js) para feedback inmediato.
// Devuelve un mensaje de error (string) o null si es válido.
export function validarIdentificacion(idPrefijo, idNumero) {
  if (!PREFIJOS_ID.includes(idPrefijo)) return 'Prefijo de identificación no válido';
  const valor = (idNumero || '').trim();
  if (!valor) return 'La identificación es obligatoria';
  if (idPrefijo === 'P') {
    if (!PASAPORTE_RE.test(valor)) return 'Pasaporte inválido (5 a 15 caracteres alfanuméricos)';
  } else if (!NUMERO_RE.test(valor)) {
    return 'Número inválido (6 a 10 dígitos)';
  }
  return null;
}
