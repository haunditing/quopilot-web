import { Link } from "react-router-dom";

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950 text-slate-300">
      <h1 className="text-xl font-bold text-white">Acceso no autorizado</h1>
      <p className="text-sm text-slate-400 max-w-md text-center">
        Tu plan o rol no incluye las capacidades necesarias para esta sección.
      </p>
      <Link
        to="/dashboard"
        className="text-sm text-indigo-400 hover:text-indigo-300 underline"
      >
        Volver al dashboard
      </Link>
    </div>
  );
}
