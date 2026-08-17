# Widget de Chat Público — Especificaciones Técnicas de Mejora

> Documento de diseño técnico para las mejoras de UI/UX, accesibilidad y
> ciberseguridad del widget de chat público (`PublicChat.tsx`).

---

## 1. Estado actual (baseline)

| Área | Componente | Estado actual |
| --- | --- | --- |
| Vista de conversación | `src/pages/PublicChat.tsx` | Burbujas diferenciadas solo por `direction` (INBOUND/OUTBOUND). No distingue `senderType` (AI/AGENT/SYSTEM/CUSTOMER). |
| Estado cerrado | `PublicChat.tsx` | Input `disabled` cuando `closed`, pero sin feedback visual dedicado ni tooltip. |
| Entrada de texto | `PublicChat.tsx` | `<input type="text">`: sin saltos de línea, sin Enter/Shift+Enter diferenciado. |
| Cabecera | `PublicChat.tsx` | Muestra título del tenant/canal, sin avatar ni indicador de presencia. |
| Autenticación | `agent-public-service.ts` / `public-chat-token.ts` | JWT firmado (scope `public-chat`, expiración 30d) enviado como **query param** `?token=`. Almacenado en `sessionStorage`. |
| Validación de propiedad | `agent-public-controller.ts` | Compara `payload.conversationId` y `payload.tenantId` contra la ruta → existe. |
| Sanitización | — | No hay sanitización explícita en frontend (React escapa por defecto). Backend solo valida tipos/longitud con zod. |
| Rate limiting | — | No existe. |
| Transporte | `vite.config.ts` / `app.ts` | HTTP/WS de desarrollo. No hay enforcement de HTTPS/WSS. |

---

## 2. Especificación de cambios

### 2.1 UI/UX & Diseño de Interfaz

#### Estados del chat

1. **Chat cerrado**
   - `textarea` y botón enviar deshabilitados con paleta gris (`#e2e8f0` borde, `#94a3b8` texto, fondo `#f1f5f9`).
   - Tooltip en el botón enviar: **"La conversación está cerrada"**.
   - Badge/banner persistente dentro del thread: "Conversación cerrada".
   - Botón **"Iniciar nueva conversación"** que restablece el estado (limpia `sessionStorage` y resetea el formulario).

2. **Indicadores de remitente** (mapeo `senderType`):
   - `AI` → avatar de bot "Demito" (inicial **D**), burbuja clara con borde, etiqueta de nombre.
   - `AGENT` → avatar de agente humano "Marvin" (inicial **M**), burbuja clara distintiva (tinte distinto), etiqueta "Agente humano".
   - `SYSTEM` → banner centrado, icono de sistema, texto neutro sin avatar.
   - `CUSTOMER` → burbuja de usuario a la derecha con color accent.
   - Indicador de presencia en cabecera: dot verde "En línea" cuando la conversación está abierta y asignada/hay agente.

#### Diseño visual & accesibilidad (WCAG AA)

- Contraste ≥ 4.5:1 para texto sobre burbujas accent y cabecera. La cabecera usa `--accent` con texto blanco; se fuerza texto oscuro cuando el accent es claro (función `contrastTextFor(color)` por luminancia).
- Microanimaciones:
  - Aparición de mensajes: `fadeInUp` (opacity + translateY) vía `animation` en `.public-chat__bubble`.
  - Indicador de "escribiendo..." con puntos animados (ya existe, se mantiene).
  - `hover` en botones (transición de fondo/transformación ya presente en `Button`).
- Envío con **Enter** y salto de línea con **Shift+Enter** (textarea + `onKeyDown`).

### 2.2 Seguridad & Protección de Datos

#### Autenticación y sesiones

- El token NO debe viajar en la URL. Se cambia de query param a header
  `X-Chat-Token` (compatibilidad: si no llega el header, se acepta el query param
  para no romper integraciones existentes, marcado como `legacy`).
- `sessionStorage` sigue siendo el almacén (dato temporal por sesión; la spec
  original pedía `localStorage` o cookie HTTP-only; ver decisión en §4).
- La URL pública `/public/chat/:tenantId` ya NO expone datos sensibles del
  cliente: solo identifica al tenant. El historial se protege con el JWT y la
  validación de propiedad.

#### Validación de propiedad (ownership)

- Ya existe en `verifyChatToken` + comparación `payload.{tenantId,conversationId}`
  contra la ruta. Se refuerza:
  - El `scope` debe ser `"public-chat"`.
  - Se valida que `conversationId` y `tenantId` sean ObjectId válidos.
  - Se añade el `customerId` del payload como filtro adicional en la consulta de
    mensajes (defensa en profundidad).

#### Sanitización (anti-XSS)

- Frontend: `DOMPurify.sanitize()` aplicado al contenido antes de renderizar en
  las burbujas. Aunque React escapa por defecto, la sanitización protege
  cualquier futuro `dangerouslySetInnerHTML` y normaliza HTML.
- Backend: validación estricta zod (ya existe longitud/máx) + se añade
  sanitización de control chars y trim en el servicio `sendPublicMessage`.
- Regla de oro: **tratar siempre el contenido como texto** (nunca
  `dangerouslySetInnerHTML` en el widget).

#### Rate limiting & anti-spam

- Middleware `express-rate-limit` aplicado a TODAS las rutas públicas de chat:
  - `POST /chat/:tenantId` (inicio): 5 req / 15 min por IP.
  - `POST .../messages`: 20 req / min por IP.
  - `POST .../typing`: 20 req / min por IP.
  - `GET .../messages` y `.../typing`: 30 req / min por IP.
- Configuración centralizada en `config/rate-limit.ts`.
- Mensajes de error con `Retry-After`.

#### Conexión segura (HTTPS/WSS)

- El widget usa HTTP polling (no WebSocket actualmente). El requisito de WSS se
  documenta como práctica para el futuro; el transporte real se controla en
  infraestructura (reverse proxy / TLS):
  - `VITE_API_URL` debe apuntar a `https://...` en producción.
  - El API debe desplegarse tras un proxy TLS (nginx/Caddy/ALB).
  - Se añade validación: en `NODE_ENV=production`, si `VITE_API_URL` no es HTTPS,
    el widget lo detecta y muestra un aviso (sin bloquear desarrollo).

---

## 3. Archivos afectados

### Frontend (`quopilot-web`)
- `src/pages/PublicChat.tsx` — burbujas por `senderType`, cabecera con presencia,
  estado cerrado, textarea con Enter/Shift+Enter, botón nueva conversación,
  `DOMPurify`.
- `src/lib/sanitize.ts` — helper de sanitización (nuevo).
- `src/lib/contrast.ts` — `contrastTextFor()` para WCAG AA (nuevo).
- `src/services/agent-public-service.ts` — token por header `X-Chat-Token`.
- `src/index.css` — estilos: burbujas por tipo, cabecera, closed state, animaciones.

### Backend (`quopilot-api`)
- `src/config/rate-limit.ts` — limitadores por endpoint (nuevo).
- `src/app.ts` — monta `express-rate-limit` global o por router.
- `src/controllers/agent-public-controller.ts` — lee token de header; filtro
  `customerId`; valida `scope`.
- `src/services/agent-public-service.ts` — sanitización de contenido en
  `sendPublicMessage`; filtro por `customerId` en `getPublicMessages`.
- `src/routes/agent-public-routes.ts` — aplica rate limiters por ruta.

---

## 4. Decisiones técnicas

1. **Almacenamiento del token**: se conserva `sessionStorage` (dato por sesión,
   menos superficie que `localStorage`). La cookie HTTP-only requeriría CSRF y
   CORS con credenciales; no es viable con el patrón `apiRequest` actual sin
   refactor mayor. Si se exige cookie HTTP-only, es un cambio de fase 2.
2. **`senderType` de sistema**: los mensajes `SYSTEM` se renderizan como banner
   centrado; hoy el backend no los emite en el flujo público (el handoff usa el
   reply de la IA), por lo que el mapeo es defensivo y prepara el terreno.
3. **Contraste**: la cabecera siempre fuerza texto blanco/oscuro según
   luminancia del `--accent`; las burbujas de usuario heredan el mismo cálculo.
4. **Rate limiting** se aplica por IP; para multi-tenant, el `keyGenerator`
   puede extenderse con `req.ip + tenantId` en el futuro.
5. **WSS**: el widget no usa WebSockets hoy; documentado como mejora de
   infraestructura, no de código.
