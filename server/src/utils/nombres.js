// Utilidades para normalizar el campo NOMBRE del Registro Electoral (DBF).
// El DBF guarda el nombre completo en un solo campo con el orden
// "APELLIDOS NOMBRES" y reemplaza la "Ñ" por "#".

// Sustituye "#" por "Ñ" y colapsa espacios.
export function limpiarNombre(texto) {
  return String(texto || '')
    .replace(/#/g, 'Ñ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Separa el nombre completo en { apellidos, nombres } según las reglas:
//   - 3 o más palabras → las 2 primeras son apellidos, el resto nombres
//     (p.ej. "URBANEJA PINEDA CARLOS ALFONSO" → URBANEJA PINEDA / CARLOS ALFONSO;
//            "LAIRET FEO FELIX" → LAIRET FEO / FELIX)
//   - exactamente 2 palabras → 1 apellido + 1 nombre
//   - 1 palabra → solo apellido
export function separarNombre(textoCompleto) {
  const limpio = limpiarNombre(textoCompleto);
  if (!limpio) return { apellidos: '', nombres: '' };
  const partes = limpio.split(' ');
  if (partes.length === 1) return { apellidos: partes[0], nombres: '' };
  if (partes.length === 2) return { apellidos: partes[0], nombres: partes[1] };
  return { apellidos: partes.slice(0, 2).join(' '), nombres: partes.slice(2).join(' ') };
}
