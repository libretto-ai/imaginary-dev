import React from "react";
import * as ReactDOMClient from "react-dom/client";
import App from "./App";

console.log("loading react...");
const root = ReactDOMClient.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(<App />);
