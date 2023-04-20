import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import React, { FC, PropsWithChildren } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;

  header?: React.ReactNode;
}

export const Drawer: FC<PropsWithChildren<Props>> = ({
  isOpen,
  onClose,
  children,
  header,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        left: "0px",
        top: "0px",
        bottom: "0px",
        transition: "transform 0.3s ease 0s",
        transform: `translateX(${isOpen ? "0%" : "-100%"})`,
        backgroundColor: "var(--background)",
        borderColor: "var(--vscode-widget-border)",
        borderRightWidth: "1px",
        borderRightStyle: "solid",
        zIndex: "10",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          padding: "1rem",
          borderColor: "var(--vscode-widget-border)",
          borderBottomWidth: "1px",
          borderBottomStyle: "solid",
        }}
      >
        <div>{header}</div>
        <VSCodeButton appearance="icon" onClick={onClose}>
          <span className="codicon codicon-close" />
        </VSCodeButton>
      </div>
      <div style={{ padding: "1rem" }}>{children}</div>
    </div>
  );
};
