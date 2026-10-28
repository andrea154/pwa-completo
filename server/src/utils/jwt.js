import jwt from "jsonwebtoken";

// Sin fallback "changeme": si falta el secreto, cualquiera podría firmar tokens válidos.
function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("Falta la variable de entorno JWT_SECRET");
  return s;
}

export const signToken = (userId) =>
  jwt.sign({ id: String(userId) }, secret(), { expiresIn: "7d" });

export const verifyToken = (token) => jwt.verify(token, secret());

export const { JsonWebTokenError, TokenExpiredError } = jwt;