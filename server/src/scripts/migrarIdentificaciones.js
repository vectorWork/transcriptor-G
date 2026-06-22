import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Registro, PREFIJOS_ID } from '../models/Registro.js';
import { idTipoDesdePrefijo } from '../utils/validators.js';

// Migra los registros al nuevo formato de identificación:
//   idPrefijo (V/E/J/C/G/P)  +  idNumero (solo el número, sin prefijo)
//
// Reglas de deducción a partir de los datos viejos:
//   1) Si idNumero ya trae un prefijo válido seguido de dígitos ("V-12345678",
//      "V12345678", "J123456789") → se respeta ese prefijo y se limpia el número.
//   2) Si idTipo era 'pasaporte' → prefijo 'P', el número se conserva intacto.
//   3) En cualquier otro caso (solo dígitos, sin pista) → prefijo 'V' (lo más
//      común en una Gaceta Oficial venezolana).
//
// Es idempotente: volver a ejecutarlo sobre datos ya migrados no los cambia.

const PREFIJO_NUM_RE = new RegExp(`^(${PREFIJOS_ID.join('|')})-?(\\d{5,})$`, 'i');

export function normalizarIdentificacion(idTipo, idNumero) {
  const raw = String(idNumero || '').trim();

  // 1) Prefijo explícito + número
  const m = raw.match(PREFIJO_NUM_RE);
  if (m) {
    const idPrefijo = m[1].toUpperCase();
    return { idPrefijo, idNumero: m[2], idTipo: idTipoDesdePrefijo(idPrefijo) };
  }

  // 2) Pasaporte: número alfanumérico intacto
  if (idTipo === 'pasaporte') {
    return { idPrefijo: 'P', idNumero: raw, idTipo: 'pasaporte' };
  }

  // 3) Por defecto, venezolano: deja solo los dígitos
  const soloDigitos = raw.replace(/\D/g, '');
  return { idPrefijo: 'V', idNumero: soloDigitos || raw, idTipo: 'cedula' };
}

async function migrar() {
  await connectDB();

  const registros = await Registro.find({}).select('idPrefijo idTipo idNumero').lean();
  console.log(`[migrar:ids] Registros a revisar: ${registros.length}`);

  const ops = [];
  const muestra = [];
  for (const r of registros) {
    const norm = normalizarIdentificacion(r.idTipo, r.idNumero);
    const cambia =
      r.idPrefijo !== norm.idPrefijo ||
      r.idNumero !== norm.idNumero ||
      r.idTipo !== norm.idTipo;
    if (!cambia) continue;
    ops.push({
      updateOne: {
        filter: { _id: r._id },
        update: { $set: norm },
      },
    });
    if (muestra.length < 10) {
      muestra.push(`  ${r.idTipo}/${r.idNumero}  →  ${norm.idPrefijo}-${norm.idNumero} (${norm.idTipo})`);
    }
  }

  if (ops.length === 0) {
    console.log('[migrar:ids] Nada que actualizar: todos los registros ya están en el nuevo formato.');
  } else {
    console.log(`[migrar:ids] Ejemplos de cambios:\n${muestra.join('\n')}`);
    const res = await Registro.bulkWrite(ops);
    console.log(`[migrar:ids] Actualizados: ${res.modifiedCount} de ${ops.length} planificados.`);
  }

  await mongoose.disconnect();
}

const esEjecucionDirecta = process.argv[1] && process.argv[1].endsWith('migrarIdentificaciones.js');
if (esEjecucionDirecta) {
  migrar().catch((err) => {
    console.error('[migrar:ids] Error:', err);
    process.exit(1);
  });
}
