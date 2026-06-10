// Validación de documentos de identidad.
// Por defecto se asume contexto venezolano (Gaceta Oficial): la cédula admite
// prefijo opcional V/E seguido de 6 a 9 dígitos. El pasaporte es alfanumérico
// de 5 a 15 caracteres. Ajustar estos patrones si el país difiere.

const CEDULA_RE = /^[VEve]?-?\d{6,9}$/;
const PASAPORTE_RE = /^[A-Za-z0-9]{5,15}$/;

export function validarIdentificacion(idTipo, idNumero) {
  if (typeof idNumero !== 'string' || idNumero.trim() === '') {
    return { ok: false, mensaje: 'El número de identificación es obligatorio' };
  }
  const valor = idNumero.trim();
  if (idTipo === 'cedula') {
    if (!CEDULA_RE.test(valor)) {
      return { ok: false, mensaje: 'Cédula inválida (formato esperado: V12345678)' };
    }
  } else if (idTipo === 'pasaporte') {
    if (!PASAPORTE_RE.test(valor)) {
      return { ok: false, mensaje: 'Pasaporte inválido (5 a 15 caracteres alfanuméricos)' };
    }
  } else {
    return { ok: false, mensaje: 'Tipo de identificación no soportado' };
  }
  return { ok: true };
}
