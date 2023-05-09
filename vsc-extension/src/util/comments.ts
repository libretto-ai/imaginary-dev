import { makeTSDocParser } from "@imaginary-dev/util";
import * as tsdoc from "@microsoft/tsdoc";
import { FunctionTestCase, TestOutput } from "../../src-shared/source-info";

export function addExampleToComment(
  comment: string,
  testInput: FunctionTestCase,
  testOutput: TestOutput
) {
  const tsdocParser = makeTSDocParser();
  const parsedComment = tsdocParser.parseString(comment);
  const exampleTag = new tsdoc.DocBlock({
    blockTag: new tsdoc.DocBlockTag({
      configuration: tsdocParser.configuration,
      tagName: "@example",
    }),
    configuration: tsdocParser.configuration,
  });
  try {
    exampleTag.content.appendNodeInParagraph(
      new tsdoc.DocPlainText({
        configuration: tsdocParser.configuration,
        text: "Input:",
      })
    );

    exampleTag.content.appendNode(
      new tsdoc.DocFencedCode({
        configuration: tsdocParser.configuration,
        language: "json",
        code: JSON.stringify(testInput.inputs, null, 2) + "\n",
      })
    );
    exampleTag.content.appendNodeInParagraph(
      new tsdoc.DocPlainText({
        configuration: tsdocParser.configuration,
        text: "Output:",
      })
    );
    exampleTag.content.appendNode(
      new tsdoc.DocFencedCode({
        configuration: tsdocParser.configuration,
        language: "json",
        code: JSON.stringify(testOutput.output, null, 2) + "\n",
      })
    );
  } catch (ex) {
    console.error(ex);
  }
  const docComment = parsedComment.docComment;
  docComment.appendCustomBlock(exampleTag);

  // TODO: deal with newlines. Maybe use a different emitter and the wrap with a
  // comment
  const emitter = new tsdoc.TSDocEmitter();
  const sb = new tsdoc.StringBuilder();
  emitter.renderComment(sb, docComment);
  const newComment = sb.toString();
  return newComment;
}
