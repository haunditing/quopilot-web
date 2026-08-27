import { useState, useEffect } from "react";

export type ChatTopic = "PRICING" | "PRODUCT_INFO" | "SUPPORT" | "DEMO" | "OTHER";

const TOPIC_MESSAGE_TEMPLATES: Partial<Record<ChatTopic, string>> = {
  PRICING: "Quiero información sobre precios y planes.",
  PRODUCT_INFO: "Quiero información sobre los productos y servicios.",
  SUPPORT: "Necesito soporte o ayuda con un tema.",
  DEMO: "Me gustaría agendar una demostración.",
};

export interface UsePublicChatLeadOptions {
  presetPlan?: string;
}

export function usePublicChatLead(options: UsePublicChatLeadOptions = {}) {
  const { presetPlan } = options;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [topic, setTopic] = useState<ChatTopic | "">("");
  const [initialMessage, setInitialMessage] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [topicError, setTopicError] = useState("");
  const [initialMessageError, setInitialMessageError] = useState("");

  useEffect(() => {
    if (!presetPlan || topic) return;
    const normalized = presetPlan.trim().toUpperCase();
    const valid: ChatTopic[] = ["PRICING", "PRODUCT_INFO", "SUPPORT", "DEMO", "OTHER"];
    if ((valid as string[]).includes(normalized)) {
      const asTopic = normalized as ChatTopic;
      setTopic(asTopic);
      if (asTopic !== "OTHER") setInitialMessage(TOPIC_MESSAGE_TEMPLATES[asTopic] ?? "");
    } else {
      setTopic("PRICING");
      setInitialMessage(`Me interesa el plan ${presetPlan}. ${TOPIC_MESSAGE_TEMPLATES.PRICING ?? ""}`.trim());
    }
  }, [presetPlan, topic]);

  return {
    name, setName, nameError, setNameError,
    email, setEmail, emailError, setEmailError,
    phone, setPhone, phoneError, setPhoneError,
    company, setCompany,
    topic, setTopic, topicError, setTopicError,
    initialMessage, setInitialMessage, initialMessageError, setInitialMessageError,
  };
}
