import {
  DocCodeSpan,
  DocErrorText,
  DocExcerpt,
  DocNode,
  DocNodeKind,
  DocParagraph,
  DocPlainText,
  DocSection,
  DocSoftBreak,
  ParserContext,
  TSDocMessageId,
  TSDocParser,
  TSDocTagDefinition,
  TSDocTagSyntaxKind,
} from "@microsoft/tsdoc";
import { AI_SERVICES, ServiceParameters } from "./function-definition";

export function makeTSDocParser() {
  const tsdocParser: TSDocParser = new TSDocParser();
  tsdocParser.configuration.addTagDefinition(
    new TSDocTagDefinition({
      tagName: "@imaginary",
      syntaxKind: TSDocTagSyntaxKind.ModifierTag,
      allowMultiple: false,
    })
  );
  AI_SERVICES.forEach((serviceKey) => {
    tsdocParser.configuration.addTagDefinition(
      new TSDocTagDefinition({
        tagName: `@${serviceKey}`,
        syntaxKind: TSDocTagSyntaxKind.BlockTag,
        allowMultiple: true,
      })
    );
  });
  return tsdocParser;
}

export function extractServiceParameters(
  parser: TSDocParser,
  funcComment: string
): ServiceParameters {
  const parsedComment = parser.parseString(funcComment);
  const result: ServiceParameters = {};
  AI_SERVICES.forEach((serviceKey) => {
    const tagText = getBlockTagContent(parsedComment, `@${serviceKey}`);
    if (!tagText) {
      return;
    }
    try {
      // TODO: use something other than JSON to parse this
      const value = JSON.parse(tagText);
      result[serviceKey] = value;
    } catch (ex) {
      console.warn("Failed to parse ", serviceKey, "tag: ", ex);
    }
  });
  return result;
}

function getBlockTagContent(parsedComment: ParserContext, tagName: string) {
  const block = parsedComment.docComment.customBlocks.find(
    ({ blockTag }) => blockTag.tagName === tagName
  );
  if (!block) {
    return null;
  }
  return extractPlainText(block.content).trim();
}

function extractPlainText(d: DocNode): string {
  switch (d.kind) {
    case DocNodeKind.PlainText: {
      const pt = d as DocPlainText;
      return pt.text;
    }
    case DocNodeKind.CodeSpan: {
      const dcs = d as DocCodeSpan;
      return dcs.code;
    }
    case DocNodeKind.Section:
    case DocNodeKind.Paragraph:
    case DocNodeKind.SoftBreak:
    case DocNodeKind.ErrorText:
    case DocNodeKind.Excerpt: {
      const ds = d as
        | DocSection
        | DocParagraph
        | DocSoftBreak
        | DocExcerpt
        | DocErrorText;
      const children = ds
        .getChildNodes()
        .map((child) => extractPlainText(child));
      return children.join("");
    }
    case DocNodeKind.Paragraph: {
    }
  }
  throw new Error(`Cannot extract node of type ${d.kind}`);
}

export function isImaginaryCommentBlock(parsedComment: ParserContext) {
  // determins if it is even a docstring
  if (!parsedComment.tokens.length) {
    return false;
  }

  // even if we found errors, if there is no @imaginary, then just ignore the comment
  const isImaginary =
    parsedComment.docComment.modifierTagSet.hasTagName("@imaginary");
  if (!isImaginary) {
    return false;
  }

  parsedComment.log.messages.forEach((message) => {
    if (fatalTSDocIds.includes(message.messageId)) {
      throw new Error(`Syntax error ${message.messageId}: ${message.text}`);
    }
  });

  return isImaginary;
}

/**
 * A list of messageIds that are consequential to prompt-js execution. If
 * they are actual TSDoc syntax errors, that is a problem to be handled by other
 * tool
 */
const fatalTSDocIds: TSDocMessageId[] = [
  TSDocMessageId.ParamTagWithInvalidName,
];
