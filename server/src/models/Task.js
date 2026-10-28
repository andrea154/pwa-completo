import mongoose from "mongoose";

export const STATUS = ["Pendiente", "En Progreso", "Completada"];
export const PRIORITY = ["Baja", "Media", "Alta"];

const taskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, trim: true, default: "", maxlength: 2000 },
    status: { type: String, enum: STATUS, default: "Pendiente" },
    priority: { type: String, enum: PRIORITY, default: "Media" },
    dueDate: { type: Date, default: null },
    remindedAt: { type: Date, default: null }, // cuándo se envió el recordatorio push
    // id generado en el navegador (offline). Strings vacíos se guardan como "sin valor".
    clienteId: {
      type: String,
      set: (v) => (typeof v === "string" && v.trim() ? v.trim() : undefined),
    },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

taskSchema.index({ user: 1, createdAt: -1 });

// Único por (user, clienteId) solo cuando clienteId es un string.
// Ojo: partialFilterExpression NO acepta $ne ni $not; por eso la versión
// anterior nunca llegó a crearse en MongoDB.
taskSchema.index(
  { user: 1, clienteId: 1 },
  {
    unique: true,
    partialFilterExpression: { clienteId: { $type: "string" } },
    name: "uniq_user_clienteId",
  }
);

// Para la búsqueda del cron de recordatorios
taskSchema.index({ remindedAt: 1, dueDate: 1 });

export default mongoose.model("Task", taskSchema);