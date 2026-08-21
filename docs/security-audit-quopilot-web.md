# Informe de Auditoría de Seguridad — quopilot-web

**Alcance**: autorización por roles y capacidades en el frontend
**Fecha**: 2026-08-21
**Método**: revisión estática de código (rutas, guards, hooks, cliente HTTP, almacenamiento local)
**Estado post-remediación**: ✅ Críticos y altos remediados · Fase 2 documentada al final

---

## Resumen ejecutivo

La aplicación presentaba un **bypass de autenticación a nivel cliente** (datos mockeados sustituían errores del backend, incluyendo el login), almacenamiento de **contraseñas en texto plano**, y una estrategia de autorización basada casi exclusivamente en ocultar elementos de menú. El backend re-validaba todo (`authorize()` + `requireCapability()` + motor de entitlements), por lo que **no hubo exposición real de datos**; el riesgo era de suplantación visual de sesión y fragilidad estructural.

---

## Hallazgos

### 🔴 C1 — Bypass de autenticación vía Mock Fallback
**Archivos**: `src/lib/api.ts`, `src/lib/mockFallback.ts` (eliminado)
Ante cualquier error HTTP (incluido 401) o fallo de red, `apiRequest` retornaba datos simulados. Para `/api/auth/login` el mock devolvía `{token:"mock-token", role:"TENANT_ADMIN"}`: cualquier email/contraseña "iniciaba sesión" como administrador con datos ficticios en toda la app.

**Remediación aplicada**: `apiRequest` propaga siempre los errores; `mockFallback.ts` eliminado. Además, un 401 fuera del login limpia la sesión y redirige a `/login` (interceptor).

### 🔴 C2 — Contraseña en texto plano en localStorage
**Archivos**: `src/services/auth-storage.ts`, `src/pages/Login.tsx`
El "recordar credenciales" persistía `{email, password}` sin cifrar.

**Remediación aplicada**: solo se persiste el email (`remembered-email`).

### 🟠 A1 — Route guards inexistentes
Solo `/internal/assistant` estaba protegida; rutas como `/users`, `/channels`, `/settings/company` eran accesibles por URL directa dependiendo de checks dispersos dentro de cada página.

**Remediación aplicada**: todas las rutas protegidas envueltas con `CapabilityRoute` usando códigos del catálogo declarativo:

| Ruta | Requisito |
|---|---|
| `/dashboard` | `dashboard.view` ó `superAdmin.dashboard` |
| `/quotes` (+detalle) | `quotes.view` |
| `/quotes/new` | `quotes.create` |
| `/sales*` | `sales.view` |
| `/customers` (+detalle) | `customers.view` |
| `/customers/new` | `customers.create` |
| `/products*` | `products.view` / `create` |
| `/channels*` | `channels.view` / `create` / `update` |
| `/conversations` | `conversations.view` |
| `/users*` | `users.view` / `create` / `update` |
| `/chat` | `agent.chat` |
| `/agent` | `agent.configure` |
| `/agent/assistant` | `agent.assistant` ó `agent.chat` |
| `/settings/company` | `tenants.updateMe` |
| `/internal/assistant` | `internalAssistant.chat` |

### 🟠 A2 — Doble modelo de capacidades
Coexistían el nuevo modelo rol∩plan (`GET /api/me/capabilities`) con la matriz estática `lib/permissions.ts`.

**Remediación aplicada**: el menú (`AppLayout`) ahora consume `useCapabilities` (rol∩plan del backend). `permissions.ts` marcado `@deprecated`.

### 🟠 A3 — Rol de localStorage sin revalidación
`getUserRole()` sigue siendo cosmético (etiquetas/tema). Toda decisión de acceso real pasa por capacidades del backend.

### 🟡 M1 — Menú fail-open durante carga → **Corregido**: fail-closed (ítems ocultos hasta confirmar capacidad).
### 🟡 M2 — Mocks de dashboards/negocio → **Corregido**: eliminados con C1.
### 🟡 M3 — Sesiones zombis tras expiración del JWT → **Corregido**: interceptor 401 global.

---

## Controles verificados como correctos

- `ProtectedLayout`: exige token y fuerza cambio de contraseña pendiente.
- Fail-closed general: si `/me/capabilities` falla, se ocultan las acciones protegidas.
- Paridad servidor: cada endpoint sensible re-valida con `authorize()`, `requireCapability()`, límites de uso y motor de entitlements (plan∩rol∩dominio).
- `PublicChat` público por diseño con rate-limits en backend.

## Fase 2 (pendiente, no bloqueante)

1. Migrar los `can()` de páginas individuales (`CustomerDetail`, `Channels`, etc.) desde `permissions.ts` hacia `useCapabilities`.
2. Considerar refresh tokens o cookies httpOnly para reducir superficie XSS del JWT.
3. Registrar intentos no autorizados (telemetría ligera en `/unauthorized`).
