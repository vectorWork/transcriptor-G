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

const CEDULA_RE = /^[VEve]?-?\d{6,9}$/;
const PASAPORTE_RE = /^[A-Za-z0-9]{5,15}$/;

// Misma lógica que el backend (server/src/utils/validators.js) para feedback inmediato.
export function validarIdentificacion(idTipo, idNumero) {
  const valor = (idNumero || '').trim();
  if (!valor) return 'La identificación es obligatoria';
  if (idTipo === 'cedula' && !CEDULA_RE.test(valor)) {
    return 'Cédula inválida (ej.: V12345678)';
  }
  if (idTipo === 'pasaporte' && !PASAPORTE_RE.test(valor)) {
    return 'Pasaporte inválido (5 a 15 caracteres alfanuméricos)';
  }
  return null;
}
