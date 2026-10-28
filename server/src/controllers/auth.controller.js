import bcrypt from "bcryptjs";
import User from "../models/user.js";
import { signToken } from "../utils/jwt.js";

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email });
const normEmail = (e) => String(e ?? "").trim().toLowerCase();

export async function register(req, res) {
  const name = String(req.body?.name ?? "").trim();
  const email = normEmail(req.body?.email);
  const password = String(req.body?.password ?? "");

  if (!name || !email || !password)
    return res.status(400).json({ message: "Todos los campos son requeridos" });
  if (password.length < 6)
    return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres" });

  // Normalizar el email antes de buscar: antes "Ana@x.com" y "ana@x.com"
  // pasaban la validación y terminaban en un error 500 por el índice único.
  if (await User.exists({ email }))
    return res.status(409).json({ message: "Ya existe una cuenta con ese email" });

  try {
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
    res.status(201).json({ token: signToken(user._id), user: publicUser(user) });
  } catch (e) {
    if (e?.code === 11000) // dos registros simultáneos con el mismo email
      return res.status(409).json({ message: "Ya existe una cuenta con ese email" });
    throw e;
  }
}

export async function login(req, res) {
  const email = normEmail(req.body?.email);
  const password = String(req.body?.password ?? "");

  const user = await User.findOne({ email });
  const ok = user && (await bcrypt.compare(password, user.password));
  if (!ok) return res.status(401).json({ message: "Email o contraseña incorrectos" });

  res.json({ token: signToken(user._id), user: publicUser(user) });
}

export async function profile(req, res) {
  const user = await User.findById(req.userId).select("_id name email");
  if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
  res.json({ user: publicUser(user) });
}