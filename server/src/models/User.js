import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'transcriptor'],
      default: 'transcriptor',
    },
    activo: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    lastLogin: { type: Date, default: null },
    // Marcador de lectura del transcriptor (por usuario, no por gaceta, ya que
    // solo trabaja una gaceta a la vez). Guarda en qué página se quedó.
    paginaGuardada: { type: Number, default: null },
    gacetaGuardada: { type: mongoose.Schema.Types.ObjectId, ref: 'Gaceta', default: null },
  },
  { timestamps: true }
);

userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    nombre: this.nombre,
    username: this.username,
    role: this.role,
    activo: this.activo,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', userSchema);
