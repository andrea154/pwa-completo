import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, errorMessage } from "../api";
import { startSession } from "../auth";
import logo from "../assets/logo.png";
export default function Register() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", { name, email, password });
      await startSession(data.token, data.user.id);
      nav("/dashboard", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "No se pudo crear la cuenta"));
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="auth-wrap">
      <div className="card">
        <div className="brand">
          <img src={logo} alt="" className="logo-img" />
          <h2>Crear cuenta</h2>
          <p className="muted">Tus tareas, en todos tus dispositivos</p>
        </div>
        <form className="form" onSubmit={onSubmit}>
          <label htmlFor="name">Nombre</label>
          <input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" required />
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@dominio.com" required />
          <label htmlFor="password">Contraseña</label>
          <input
            id="password" type="password" autoComplete="new-password" minLength={6}
            value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required
          />
          {error && <div className="alert" role="alert">{error}</div>}
          <button className="btn primary" disabled={loading}>{loading ? "Creando…" : "Crear cuenta"}</button>
        </form>
        <div className="footer-links">
          <span className="muted">¿Ya tienes cuenta?</span>
          <Link to="/" className="link">Inicia sesión</Link>
        </div>
      </div>
    </div>
  );
}