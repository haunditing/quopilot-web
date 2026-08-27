import Button from "../Button.js";
import Field from "../Field.js";
import FormMessage from "../FormMessage.js";
import Icon from "../Icon.js";
import { normalizePhoneInput } from "../../lib/validation.js";
import type { ChatTopic } from "../../hooks/usePublicChatLead.js";

const TOPIC_OPTIONS: Array<{ value: ChatTopic; label: string }> = [
  { value: "PRICING", label: "Precios y planes" },
  { value: "PRODUCT_INFO", label: "Información de productos" },
  { value: "SUPPORT", label: "Soporte" },
  { value: "DEMO", label: "Agendar demostración" },
  { value: "OTHER", label: "Otro asunto" },
];

const TOPIC_MESSAGE_TEMPLATES: Partial<Record<ChatTopic, string>> = {
  PRICING: "Quiero información sobre precios y planes.",
  PRODUCT_INFO: "Quiero información sobre los productos y servicios.",
  SUPPORT: "Necesito soporte o ayuda con un tema.",
  DEMO: "Me gustaría agendar una demostración.",
};

interface PublicChatLeadFormProps {
  compact?: boolean;
  name: string;
  setName: (v: string) => void;
  nameError: string;
  setNameError: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  emailError: string;
  setEmailError: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  phoneError: string;
  setPhoneError: (v: string) => void;
  company: string;
  setCompany: (v: string) => void;
  topic: ChatTopic | "";
  setTopic: (v: ChatTopic | "") => void;
  topicError: string;
  setTopicError: (v: string) => void;
  initialMessage: string;
  setInitialMessage: (v: string) => void;
  initialMessageError: string;
  setInitialMessageError: (v: string) => void;
  startError: string;
  starting: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

/**
 * Formulario de captura de lead — única fuente de verdad para
 * enlace público (/c/:token) y widget embebido (iframe).
 * `compact=true` → layout de 1 columna para el widget angosto.
 */
export default function PublicChatLeadForm({
  compact = false,
  name,
  setName,
  nameError,
  setNameError,
  email,
  setEmail,
  emailError,
  setEmailError,
  phone,
  setPhone,
  phoneError,
  setPhoneError,
  company,
  setCompany,
  topic,
  setTopic,
  topicError,
  setTopicError,
  initialMessage,
  setInitialMessage,
  initialMessageError,
  setInitialMessageError,
  startError,
  starting,
  onSubmit,
}: PublicChatLeadFormProps) {
  return (
    <form
      className={
        compact
          ? "flex flex-col gap-4 p-5 overflow-y-auto bg-surface-card"
          : "flex flex-col gap-4 p-8 overflow-y-auto bg-surface-card max-[767px]:p-6"
      }
      onSubmit={onSubmit}
    >
      <div className="flex flex-row items-start gap-3 pb-4 border-b border-line">
        <div className="inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-xl bg-accent-soft text-accent" aria-hidden="true">
          <Icon name="brand" size={20} />
        </div>
        <div>
          <h2 className="m-0 text-lg font-bold leading-tight text-ink-strong">Escríbenos ahora</h2>
          <p className="mt-0.5 mb-0 text-sm leading-normal text-ink-muted">Completa tus datos y te responderemos de inmediato.</p>
        </div>
      </div>

      <div className={compact ? "grid grid-cols-1 gap-3.5" : "grid grid-cols-2 gap-3.5 max-[380px]:grid-cols-1"}>
        <Field
          id="public-chat-name"
          label="Nombre"
          type="text"
          value={name}
          error={nameError}
          required
          onChange={(e) => {
            setName(e.target.value);
            setNameError("");
          }}
          placeholder="Tu nombre y apellido"
          autoComplete="name"
        />
        <Field
          id="public-chat-email"
          label="Email"
          type="email"
          value={email}
          error={emailError}
          required
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailError("");
          }}
          placeholder="tu@correo.com"
          autoComplete="email"
        />
        <Field
          id="public-chat-phone"
          label="Teléfono (WhatsApp)"
          type="tel"
          value={phone}
          error={phoneError}
          required
          helper="Con indicativo de país, ej: +57 300 000 0000"
          onChange={(e) => {
            setPhone(normalizePhoneInput(e.target.value));
            setPhoneError("");
          }}
          placeholder="+573001234567"
          autoComplete="tel"
        />
        <Field
          id="public-chat-company"
          label="Empresa (opcional)"
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Nombre de tu empresa"
          autoComplete="organization"
        />
      </div>

      <Field
        id="public-chat-topic"
        label="Asunto"
        as="select"
        error={topicError || undefined}
        value={topic}
        onChange={(e) => {
          const nextTopic = e.target.value as ChatTopic;
          setTopic(nextTopic);
          setTopicError("");
          if (nextTopic === "OTHER") {
            setInitialMessage("");
            setInitialMessageError("");
          } else {
            setInitialMessage(TOPIC_MESSAGE_TEMPLATES[nextTopic] ?? "");
            setInitialMessageError("");
          }
        }}
      >
        <option value="" disabled>
          ¿Sobre qué quieres hablar?
        </option>
        {TOPIC_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Field>

      <Field
        id="public-chat-message"
        label="Mensaje"
        as="textarea"
        rows={compact ? 2 : 3}
        error={initialMessageError || undefined}
        value={initialMessage}
        readOnly={topic !== "" && topic !== "OTHER"}
        onChange={(e) => {
          setInitialMessage(e.target.value);
          setInitialMessageError("");
        }}
        placeholder={topic === "OTHER" ? "Cuéntanos brevemente en qué te podemos ayudar" : "Se generará un mensaje según el asunto seleccionado"}
      />

      {startError && <FormMessage kind="error">{startError}</FormMessage>}

      <Button type="submit" variant="primary" icon="send" className="w-full justify-center" disabled={starting}>
        {starting ? "Iniciando..." : "Iniciar conversación"}
      </Button>
    </form>
  );
}
