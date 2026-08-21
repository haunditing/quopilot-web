import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Button from "./Button.js";
import Modal from "./Modal.js";
import { ConfirmContext } from "../hooks/useConfirm.js";
import type { ConfirmOptions } from "../hooks/useConfirm.js";

export default function ConfirmProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((result: boolean) => void) | null>(null);

  const confirm = useCallback((nextOptions: ConfirmOptions) => {
    resolverRef.current?.(false);
    resolverRef.current = null;

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOptions(nextOptions);
    });
  }, []);

  const settle = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}

      {options && (
        <Modal
          open
          title={options.title}
          onClose={() => settle(false)}
          size="confirm"
        >
          <div>
            {options.message && (
              <p className="mb-5 text-[15px] leading-normal [overflow-wrap:anywhere] text-ink-muted">
              {options.message}
            </p>
            )}

            <div className="flex flex-row justify-end gap-2.5">
              <Button
                variant="secondary"
                icon="close"
                iconOnly
                onClick={() => settle(false)}
              >
                {options.cancelLabel ?? "Cancelar"}
              </Button>

              <Button
                variant={options.danger ? "danger" : "primary"}
                icon="check"
                iconOnly
                onClick={() => settle(true)}
              >
                {options.confirmLabel ?? "Confirmar"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}
