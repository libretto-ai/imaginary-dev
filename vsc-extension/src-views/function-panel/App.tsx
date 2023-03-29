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
      <p>This is react running in a webview</p>
      <ul>
        {Object.entries(sources).map(([filename, source]) => {
          return (
            <Fragment key={filename}>
              <li>{filename}</li>
              <ul>
                {source.functions.map((fn) => (
                  <li key={fn.name}>{fn.name}</li>
                ))}
              </ul>
            </Fragment>
          );
        })}
      </ul>
      <pre>{JSON.stringify(sources, null, 4)}</pre>
    </RecoilRoot>
  );
};

export default App;
