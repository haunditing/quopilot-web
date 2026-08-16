import { useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import Icon from "./Icon.js";

interface SliderVerifyProps {
  label?: string;
  onComplete: () => void;
  disabled?: boolean;
}

const KNOB_SIZE = 44;
const TRACK_PADDING = 4;
const COMPLETE_RATIO = 0.97;

export default function SliderVerify({
  label = "Desliza para verificar",
  onComplete,
  disabled = false,
}: SliderVerifyProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const maxXRef = useRef(0);
  const draggingRef = useRef(false);
  const completedRef = useRef(false);

  const [knobX, setKnobX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [completed, setCompleted] = useState(false);

  function measure() {
    const track = trackRef.current;

    if (!track) {
      return null;
    }

    const width = track.getBoundingClientRect().width;
    maxXRef.current = Math.max(0, width - KNOB_SIZE - TRACK_PADDING * 2);

    return track.getBoundingClientRect();
  }

  function updateFromClientX(clientX: number) {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    const rect = track.getBoundingClientRect();
    maxXRef.current = Math.max(0, rect.width - KNOB_SIZE - TRACK_PADDING * 2);

    const next = Math.max(
      0,
      Math.min(maxXRef.current, clientX - rect.left - KNOB_SIZE / 2),
    );

    if (next >= maxXRef.current * COMPLETE_RATIO) {
      complete();
      return;
    }

    setKnobX(next);
  }

  function complete() {
    if (completedRef.current) {
      return;
    }

    completedRef.current = true;
    setCompleted(true);
    setKnobX(maxXRef.current);
    onComplete();
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled || completedRef.current) {
      return;
    }

    draggingRef.current = true;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromClientX(event.clientX);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) {
      return;
    }

    updateFromClientX(event.clientX);
  }

  function handlePointerUp() {
    if (!draggingRef.current) {
      return;
    }

    draggingRef.current = false;
    setDragging(false);

    if (!completedRef.current) {
      setKnobX(0);
    }
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (disabled || completedRef.current) {
      return;
    }

    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      measure();

      const step = Math.max(8, maxXRef.current * 0.12);
      const next = Math.min(maxXRef.current, knobX + step);

      if (next >= maxXRef.current * COMPLETE_RATIO) {
        complete();
        return;
      }

      setKnobX(next);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      measure();
      setKnobX(Math.max(0, knobX - Math.max(8, maxXRef.current * 0.12)));
    } else if (event.key === "Home") {
      event.preventDefault();
      setKnobX(0);
    }
  }

  const statusLabel = completed
    ? disabled
      ? "Iniciando sesión..."
      : "Verificado"
    : label;

  return (
    <div
      className={[
        "slider-verify",
        completed ? "slider-verify--done" : "",
        dragging ? "slider-verify--dragging" : "",
        disabled ? "slider-verify--disabled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="slider-verify__track" ref={trackRef}>
        <span className="slider-verify__label">{statusLabel}</span>

        <div
          className="slider-verify__knob"
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={
            maxXRef.current > 0 ? Math.round((knobX / maxXRef.current) * 100) : 0
          }
          aria-disabled={disabled}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
          style={{ transform: `translateX(${knobX}px)` }}
        >
          <Icon name={completed ? "check" : "login"} size={18} />
        </div>
      </div>
    </div>
  );
}
