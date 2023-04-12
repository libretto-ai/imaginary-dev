import { VSCodeTextArea } from "@vscode/webview-ui-toolkit/react";
import React, { FC } from "react";

export const ParamEditor: FC<{
  value: string;
  onChange: (arg0: string) => void;
}> = ({ value, onChange }) => {
  // const textAreaRef = useRef<typeof VSCodeTextArea>();
  // useEffect(() => {
  //   if (textAreaRef.current) {
  //     // We need to reset the height momentarily to get the correct scrollHeight for the textarea
  //     textAreaRef.current.style.height = "0px";
  //     const scrollHeight = textAreaRef.current.scrollHeight;
  //     // We then set the height directly, outside of the render loop
  //     // Trying to set this with state or a ref will product an incorrect value.
  //     textAreaRef.current.style.height = scrollHeight + "px";
  //   }
  // }, [textAreaRef, value]);
  return (
    <VSCodeTextArea
      // ref={textAreaRef}
      style={{ flex: 1, width: "100%", height: "auto" }}
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
    />
  );
};
