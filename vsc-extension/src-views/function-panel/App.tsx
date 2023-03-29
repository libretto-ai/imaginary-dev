import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react";
import React, { Fragment, useEffect, useState } from "react";
import { RecoilRoot } from "recoil";
import { SerializableSourceFileMap } from "../../src-shared/source-info";

const App = () => {
  const [sources, setSources] = useState<SerializableSourceFileMap>({});
  useEffect(() => {
    window.addEventListener("message", (event) => {
      switch (event.data.id as string) {
        case "update-sources": {
          const [sources] = event.data.params as [
            sources: SerializableSourceFileMap
          ];
          console.log("got sources: ", sources);
          setSources(sources);
          break;
        }
        default:
          console.log("Unknmown message: ", event);
      }
    });
  }, []);
  return (
    <RecoilRoot>
      <div>
        Select function:
        <VSCodeDropdown>
          {Object.entries(sources).map(([filename, source]) => {
            return (
              <Fragment key={filename}>
                <VSCodeOption disabled>{filename}</VSCodeOption>
                {source.functions.map((fn) => (
                  <VSCodeOption key={fn.name}>
                    <span style={{ marginLeft: "1rem" }}>{fn.name}</span>
                  </VSCodeOption>
                ))}
              </Fragment>
            );
          })}
        </VSCodeDropdown>
      </div>
      <pre>{JSON.stringify(sources, null, 4)}</pre>
    </RecoilRoot>
  );
};

export default App;
