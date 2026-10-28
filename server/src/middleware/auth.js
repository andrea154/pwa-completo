import { verifyToken, JsonWebTokenError, TokenExpiredError } from "../utils/jwt.js";

export function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Token requerido" });

  try {
    const payload = verifyToken(token);
    req.userId = payload.id;
    next();
  } catch (e) {
    if (e instanceof TokenExpiredError)
      return res.status(401).json({ message: "Tu sesión expiró, inicia sesión de nuevo" });
    if (e instanceof JsonWebTokenError)
      return res.status(401).json({ message: "Token inválido" });
    next(e); // p. ej. falta JWT_SECRET: es error del servidor, no del usuario
  }
}
