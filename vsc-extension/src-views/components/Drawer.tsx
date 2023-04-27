import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import React, { FC, PropsWithChildren } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;

  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Drawer: FC<PropsWithChildren<Props>> = ({
  isOpen,
  onClose,
  children,
  header,
  footer,
}) => {
  return (
    <>
      {isOpen && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.48)",
            zIndex: 10,
          }}
        />
      )}
      <div
        style={{
          position: "fixed",
          left: "0px",
          top: "0px",
          bottom: "0px",
          transition: "transform 0.3s ease 0s",
          transform: `translateX(${isOpen ? "0%" : "-100%"})`,
          backgroundColor: "var(--background)",
          borderColor: "var(--vscode-widget-border)",
          borderRightWidth: "1px",
          borderRightStyle: "solid",
          zIndex: 20,
          display: "flex",
          flexDirection: "column",
          // TODO: parameterize this
          minWidth: "250px",
          maxWidth: "50%",
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
        <div style={{ padding: "1rem", flex: 1, overflow: "auto" }}>
          {children}
        </div>
        {footer && (
          <div
            style={{
              padding: "1rem",
              borderColor: "var(--vscode-widget-border)",
              borderTopWidth: "1px",
              borderTopStyle: "solid",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </>
  );
};
