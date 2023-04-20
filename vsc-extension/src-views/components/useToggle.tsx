import { useCallback, useState } from "react";

export function useToggle(defaultState = false) {
  const [isOpen, setIsOpen] = useState(defaultState);
  const onOpen = useCallback(() => setIsOpen(true), []);
  const onClose = useCallback(() => setIsOpen(false), []);
  return {
    isOpen,
    setIsOpen,
    onOpen,
    onClose,
  };
}
