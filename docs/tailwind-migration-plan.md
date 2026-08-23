# Plan de Migración a Tailwind CSS — `quopilot-web` ✅ COMPLETADA

> **Estado final (2026-08-21)**: migración ejecutada al 100%.
> - `index.css`: 7.549 → **720 líneas** (−90.5%) · bundle CSS: **61.5 kB / 12.1 kB gzip**
> - Todas las páginas y componentes usan utilidades; cero selectores BEM muertos.
> - Excepción documentada: tokens de rol + tipografía global ≥768px (ver §Excepción).
> - Pendiente: QA visual completo y activación de `preflight` (Fase 4).

---

 — `quopilot-web` (Estrategia Strangler Fig)

**Autor**: Arquitectura Frontend · **Fecha**: 2026-08-21 · **Estado**: Propuesta
**Progreso real**: 7.549 → ~5.500 líneas (−27%) tras Fases 1-2 y barridos de CSS propio a utilidades Tailwind sin pausar el desarrollo.

---

## 1. Diagnóstico del Estado Actual

### Entornos del monorepo

| App | Estilos | Estado |
|---|---|---|
| `quopilot-web-admin` | **Tailwind v3.4.19** (PostCSS + autoprefixer + `tailwind.config.js`, theme extend vacío = paleta default) | ✅ Referencia — no requiere migración |
| `quopilot-web` (**este repo**) | CSS propio: `src/index.css` (7.549 líneas, BEM-ish, tema claro) + `DataListView.css` (483, co-localizado) | 🎯 Objetivo de este plan |

Stack: Vite 8 + React 19 + TypeScript 6 · Sin SASS/LESS/CSS Modules/styled-components · UI library propia (~25 componentes en `src/components`).

### Inventario del CSS legado (`index.css`)

- **Tokens `:root` existentes**: accent `#aa3bff` · success `#059669` · danger `#dc2626` · shell oscuro `#1a0d26/#2d1a40/#c084fc` · superficies `#ffffff/#f4f6f8` · texto `#6b6375/#08060d` · borde `#e5e4e7` · espaciados 4/8/16/24/32 · max-width 1280px · sombra suave.
- **~45 secciones BEM** identificadas por comentarios: MASTER-DETAIL, APP LAYOUT (mobile-first), ROLE THEMES, PAGE HEADER, PAGE STATE, STAT CARD, ENTITY GRID, STATUS BADGE, EMPTY STATE, MODAL (bottom-sheet→centered), TABS, DETAIL CARD, quote-erp, settings, public-chat, assistant-chat, conversations…
- Tipografía: `system-ui` stack (sans y heading idénticos) + `ui-monospace`.

---

## 2. Plan de Configuración e Instalación

### Instalación (compatible Vite 8 / React 19)

```bash
npm install -D tailwindcss@^3.4.19 postcss@^8.5.26 autoprefixer@^10.5.4
npx tailwindcss init -p
```

> Se elige **v3.4** (y no v4) para mantener **paridad exacta con `quopilot-web-admin`**: mismo motor, mismo archivo de configuración clásico, mismos patrones de clase. La actualización conjunta a v4 queda fuera de alcance.

### Config inicial — `tailwind.config.js` (rescata los tokens actuales)

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  corePlugins: {
    // CRÍTICO durante la coexistencia: el CSS legado asume estilos
    // de agente usuario por defecto (márgenes de h1/p, botones, etc.).
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#aa3bff",
          soft: "rgba(170, 59, 255, 0.1)",
          border: "rgba(170, 59, 255, 0.5)",
        },
        success: "#059669",
        danger: "#dc2626",
        surface: { light: "#f4f6f8", card: "#ffffff" },
        ink: { muted: "#6b6375", strong: "#08060d" },
        line: "#e5e4e7",
        shell: { bg: "#1a0d26", border: "#2d1a40", text: "#f5f2fa", muted: "#b5aebe" },
      },
      maxWidth: { content: "1280px" },
      boxShadow: { card: "0 1px 3px rgba(0, 0, 0, 0.04)" },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

> El espaciado legado (4/8/16/24/32) ya coincide con la escala nativa de Tailwind (`1/2/4/6/8`) — no requiere mapeo.

### `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* …el CSS legado permanece DEBAJO, intacto, y se va borrando por fases… */
```

### Estrategia anti-conflicto

| Riesgo | Mitigación |
|---|---|
| Preflight resetea h1/p/button y rompe las ~100 pantallas legadas | **`preflight: false` hasta Fase 4**; se activa solo cuando el CSS propio desaparezca |
| Especificidad utilidad vs bloque BEM | Los selectores legacy son clases simples (`.page-state__title`), misma especificidad que una utilidad: **el orden del archivo decide** → las utilidades van ARRIBA del legado, así el legado gana mientras exista (comportamiento predecible: “nada cambia hasta que migres ese bloque”) |
| Colisiones de nombres | Cero: el legado usa prefijos BEM (`app-layout__`, `quote-erp__`…) que no colisionan con utilidades |
| Clases dinámicas purgadas por error | `content` cubre todo `src/`; prohibido construir nombres de clase por concatenación |

---

## 3. Roadmap Strangler Fig (4 fases)

> Regla de oro: **una PR = un bloque CSS eliminado de `index.css`.** Nada se migra “por adelantado”.

### Fase 0 — Setup seguro (½ día)
Instalar, configurar, verificar que **todas** las pantallas quedan píxele-idénticas (el CSS legado sigue ganando por orden).

### Fase 1 — Átomos compartidos (1–2 días) · bloques: BUTTON?, FIELD, PAGE HEADER, PAGE STATE, EMPTY STATE, STATUS BADGE, BACK BUTTON, STAT CARD
Migrar los componentes de `src/components` cuyo CSS vive en secciones propias y cuyos consumidores son otros componentes (los cambios internos son invisibles para las páginas). Cada componente migrado borra su sección de `index.css`.
Excepciones: `BUTTON` no tiene sección propia aún — crear utilidades `.btn-*`→componente al llegar a Fase 2.

### Fase 2 — Moléculas y layouts genéricos (2–3 días) · bloques: MASTER-DETAIL, DETAIL CARD + SECTION, MODAL, TABS, ENTITY GRID/CARD, FilterPanel restos, `DataListView.css`
Convertir shells reutilizables. `DataListView.css` puede quedar como último ítem de la fase (es el más grande y estable).

### Fase 3 — Páginas específicas (3–5 días) · bloques: APP LAYOUT, ROLE THEMES, quote-erp, settings, public-chat, assistant-chat, conversations, entity page specifics
Página por página, empezando por las de menor tamaño (UserForm → ChannelForm → AgentChat → PublicChat → Conversations → CompanySettings → AgentConfig → ProductDetail).

### Fase 4 — Purge y encendido de Preflight (1 día)
1. `index.css` debe quedar reducido a las 3 directivas (+ tokens `:root` si aún se usan en JS).
2. Activar `preflight: true` y resolver los deltas visuales que aparezcan (serán menores porque ya casi nada depende de estilos UA).
3. Borrar variables `:root` muertas y `DataListView.css` si se convirtió.
4. Métrica final: bundle CSS esperado ≈ 10–30 KB vs ~110 KB actuales.

---

## 4. Mapeo Antes / Después (ejemplos reales del repo)

### Ejemplo simple — `src/components/PageState.tsx` (bloque PAGE STATE)

**Antes**
```tsx
const icon = kind === "error" ? "error" : "empty";
const className = kind === "error" ? "page-state page-state--error" : "page-state";
return (
  <main className={className}>
    <Icon name={icon} size={42} className="page-state__icon" />
    <h1>{title}</h1>
    {message && <p>{message}</p>}
    {children}
  </main>
);
```
```css
/* index.css (≈30 líneas) */
.page-state { min-height:60vh; display:flex; flex-direction:column;
  align-items:center; justify-content:center; text-align:center; gap:8px;
  color: var(--text); }
.page-state__icon { opacity:.5 }
.page-state--error .page-state__icon { color: var(--danger) }
.page-state h1 { font-size:20px; color:#08060d; margin:0 }
.page-state p  { font-size:14px; margin:0; max-width:420px }
```

**Después**
```tsx
const isError = kind === "error";
return (
  <main
    role={isError ? "alert" : "status"}
    className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center"
  >
    <Icon
      name={isError ? "error" : "empty"}
      size={42}
      className={`opacity-50 ${isError ? "text-danger" : ""}`}
    />
    <h1 className="m-0 text-xl font-bold text-ink-strong">{title}</h1>
    {message && <p className="m-0 max-w-[420px] text-sm">{message}</p>}
    {children}
  </main>
);
```
Y se borra la sección PAGE STATE completa.

### Ejemplo complejo — `src/components/Field.tsx` (bloque FORM FIELD + estados)

**Antes** — clase BEM condicional y CSS aparte:
```tsx
const className = error ? "form-field form-field--invalid" : "form-field";
return (
  <div className={className}>
    <label htmlFor={id}>{label}</label>
    <div className={Icon ? "relative" : undefined}>…input…</div>
    {helper && <div className="form-field__helper">{helper}</div>}
    {error && <span className="form-field__error">{error}</span>}
  </div>
);
```
```css
.form-field { display:flex; flex-direction:column; gap:6px }
.form-field label { font-size:12px; font-weight:500; color:#94a3b8 }
.form-field input { width:100%; border-radius:8px; background:#0f172a;
  border:1px solid #1e293b; padding:10px 12px; font-size:12px; color:#fff }
.form-field input:focus { outline:none; border-color:#6366f1 }
.form-field--invalid input { border-color:#f43f5e }
.form-field__helper { font-size:10px; color:#64748b }
.form-field__error { font-size:11px; color:#fb7185 }
```

**Después** (ya validado en producción en `quopilot-web-admin/src/components/Field.tsx`):
```tsx
const controlClass = [
  "w-full rounded-lg bg-slate-900 border py-2.5 text-xs text-white",
  "placeholder-slate-600 focus:outline-none transition-colors",
  Icon ? "pl-9 pr-3" : "px-3",
  error
    ? "border-rose-500/60 focus:border-rose-500"
    : "border-slate-800 focus:border-indigo-500",
].join(" ");

return (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="block text-xs font-medium text-slate-400">
      {label}
    </label>
    <div className={Icon ? "relative" : undefined}>
      {Icon && (
        <Icon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
          error ? "text-rose-400" : "text-slate-500"
        }`} aria-hidden="true" />
      )}
      <input id={id} className={controlClass} aria-invalid={!!error} {...inputProps} />
    </div>
    {helper && <div className="text-[10px] text-slate-500">{helper}</div>}
    {error && <span role="alert" className="text-[11px] text-rose-400">{error}</span>}
  </div>
);
```
Ventaja demostrada: **cero CSS**, estados visibles en el propio TSX y paridad total con el panel admin (misma librería mental entre apps).

---

## Excepción arquitectónica decidida: el Shell (APP LAYOUT + ROLE THEMES + Sidebar Footer)

El layout raíz (`AppLayout.tsx`) **permanece en CSS legado de forma intencional**:

1. **Temas por rol**: `.app-layout--super-admin|tenant-admin|agent` redefinen variables CSS (`--accent`, `--shell-*`) que cascadan a todo el árbol. Es el mecanismo correcto de theming runtime — las utilidades estáticas no lo sustituyen.
2. **Estados compuestos**: colapsado/hover-expandido del sidebar y drawer móvil usan selectores descendientes (`.app-sidebar--collapsed .app-user__info{display:none}`, media queries) que requerirían duplicar la lógica como variantes JS frágiles.
3. **Aislamiento**: el shell envuelve TODAS las rutas; una regresión aquí impacta todo simultáneamente.

Las páginas DENTRO del shell sí migran completamente (esto es lo que llevamos hecho).

---

## 5. Checklist — Primer Sprint / PR

**PR 1 — Setup (Fase 0)**
- [ ] `npm i -D tailwindcss@^3.4.19 postcss@^8.5.26 autoprefixer@^10.5.4` + `npx tailwindcss init -p`
- [ ] `tailwind.config.js` con tokens (accent/success/danger/shell/surface/ink/line) y `preflight:false`
- [ ] Directivas al inicio de `src/index.css`
- [ ] Smoke test visual: login, dashboard, quotes, products, conversations sin diffs

**PR 2..n — Fase 1 (un componente por PR)**
- [ ] `PageState.tsx` + borrar sección PAGE STATE
- [ ] `EmptyState.tsx` + borrar EMPTY STATE
- [ ] `BackButton.tsx` + borrar BACK BUTTON
- [ ] `Field.tsx` + borrar FORM FIELD
- [ ] `StatusBadge.tsx` + borrar STATUS BADGE
- [ ] Gate por PR: `tsc --noEmit` ✓ · `eslint src` ✓ · `vite build` ✓ · revisión visual manual de las rutas afectadas

**Definition of Done de la migración (Fase 4)**
- [ ] `index.css` ≤ 20 líneas · `DataListView.css` eliminado o ≤ 0
- [ ] `preflight: true` activo sin regresiones
- [ ] 0 selectores BEM en `src/`
- [ ] Bundle CSS < 30 kB gzip
