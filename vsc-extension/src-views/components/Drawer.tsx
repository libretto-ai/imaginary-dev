import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import React, { CSSProperties, FC, PropsWithChildren } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  minWidth: Exclude<CSSProperties["minWidth"], undefined>;
  style?: CSSProperties;
}

export const Drawer: FC<PropsWithChildren<Props>> = ({
  isOpen,
  onClose,
  children,
  style,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        transition: "transform 0.3s ease",
        transform: `translateX(${isOpen ? "0%" : "-100%"})`,
        backgroundColor: "var(--background)",
        ...style,
      }}
    >
      <div>
        <VSCodeButton appearance="icon" onClick={onClose}>
          <span className="codicon codicon-close" />
        </VSCodeButton>
      </div>
      <div>{children}</div>
    </div>
  );
};
