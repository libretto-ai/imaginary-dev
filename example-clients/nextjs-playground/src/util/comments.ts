import {
  TSDocMessageId,
  TSDocParser,
  TSDocTagDefinition,
  TSDocTagSyntaxKind,
} from "@microsoft/tsdoc";

export function makeTSDocParser() {
  const tsdocParser: TSDocParser = new TSDocParser();
  tsdocParser.configuration.addTagDefinition(
    new TSDocTagDefinition({
      tagName: "@imaginary",
      syntaxKind: TSDocTagSyntaxKind.ModifierTag,
      allowMultiple: false,
    })
  );
  return tsdocParser;
}
/**
 * A list of messageIds that are consequential to prompt-js execution. If
 * they are actual TSDoc syntax errors, that is a problem to be handled by other
 * tool
 */
const fatalTSDocIds: TSDocMessageId[] = [
  TSDocMessageId.ParamTagWithInvalidName,
];
