// Validación de documentos de identidad (contexto venezolano / Gaceta Oficial).
// La identificación se compone de un PREFIJO de nomenclatura + el NÚMERO:
//   V/E/J/C/G → número de 6 a 10 dígitos (cédula, RIF, etc.)
//   P         → pasaporte alfanumérico de 5 a 15 caracteres
// El tipo "legacy" (cedula/pasaporte) se deriva del prefijo.

export const PREFIJOS_ID = ['V', 'E', 'J', 'C', 'G', 'P'];

const NUMERO_RE = /^\d{6,10}$/; // cédula / RIF (V, E, J, C, G)
const PASAPORTE_RE = /^[A-Za-z0-9]{5,15}$/; // pasaporte (P)

// Mapea el prefijo al tipo de documento que ya usaban export/tablas.
export function idTipoDesdePrefijo(idPrefijo) {
  return idPrefijo === 'P' ? 'pasaporte' : 'cedula';
}

export function validarIdentificacion(idPrefijo, idNumero) {
  if (!PREFIJOS_ID.includes(idPrefijo)) {
    return { ok: false, mensaje: 'Prefijo de identificación no válido' };
  }
  if (typeof idNumero !== 'string' || idNumero.trim() === '') {
    return { ok: false, mensaje: 'El número de identificación es obligatorio' };
  }
  const valor = idNumero.trim();
  if (idPrefijo === 'P') {
    if (!PASAPORTE_RE.test(valor)) {
      return { ok: false, mensaje: 'Pasaporte inválido (5 a 15 caracteres alfanuméricos)' };
    }
  } else if (!NUMERO_RE.test(valor)) {
    return { ok: false, mensaje: 'Número inválido (6 a 10 dígitos)' };
  }
  return { ok: true };
}
