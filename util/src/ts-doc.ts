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

export function parseImaginaryComment(
  comment: string
): ImaginaryComment | null {
  const parser: TSDocParser = makeTSDocParser();
  const parsedComment = parser.parseString(comment);

  if (!isImaginaryCommentBlock(parsedComment)) {
    return null;
  }

  return new ImaginaryComment(parsedComment, comment);
}

class ImaginaryComment {
  private parsedComment: ParserContext;
  private rawComment: string;

  constructor(parsedComment: ParserContext, rawComment: string) {
    this.parsedComment = parsedComment;
    this.rawComment = rawComment;
  }

  getServiceParameters(): ServiceParameters {
    return extractServiceParametersFromParsedComment(this.parsedComment);
  }

  setSingleServiceParameter(
    service: string,
    parameter: string,
    value: any
  ): ImaginaryComment {
    const blockTagInfo = getBlockTagInfo(this.parsedComment, `@${service}`);
    if (!blockTagInfo) {
      return this;
    }
    const { text, start, end } = blockTagInfo;
    let settings = {};
    try {
      // TODO: use something other than JSON to parse this
      settings = JSON.parse(text);
    } catch (ex) {
      console.warn("Failed to parse ", service, "tag: ", ex);
    }
    settings[parameter] = value;

    const result = parseImaginaryComment(
      this.rawComment.slice(0, start) +
        `${service} \`${JSON.stringify(settings)}\`` +
        this.rawComment.slice(end + 1)
    );
    if (result === null) {
      throw new Error(
        "Parsing error in ImaginaryComment.setSingleServiceParameter"
      );
    }
    return result;
  }

  removeSingleServiceParameter(
    service: string,
    parameter: string
  ): ImaginaryComment {
    const mutableParsedComment = makeTSDocParser().parseString(this.rawComment);
    const blockTagInfo = getBlockTagInfo(mutableParsedComment, `@${service}`);
    if (!blockTagInfo) {
      return this;
    }
    const { text, start, end } = blockTagInfo;
    let settings = {};
    try {
      // TODO: use something other than JSON to parse this
      settings = JSON.parse(text);
    } catch (ex) {
      console.warn("Failed to parse ", service, "tag: ", ex);
    }
    delete settings[parameter];

    if (Object.keys(settings).length === 0) {
    }

    const block = getBlockTag(mutableParsedComment, `@${service}`);
    if (!block) {
      return this;
    }
    block.content.clearNodes();
    const paragraph = new DocParagraph({
      configuration: mutableParsedComment.configuration,
    });
    const codeSpan = new DocCodeSpan({
      code: JSON.stringify(settings),
      configuration: mutableParsedComment.configuration,
    });
    paragraph.appendNode(codeSpan);
    block.content.appendNode(paragraph);

    return new ImaginaryComment(
      mutableParsedComment,
      mutableParsedComment.docComment.emitAsTsdoc()
    );
  }

  getText(): string {
    return this.rawComment.trim();
  }
}

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
  return extractServiceParametersFromParsedComment(
    parser.parseString(funcComment)
  );
}

function extractServiceParametersFromParsedComment(
  parsedComment: ParserContext
): ServiceParameters {
  const result: ServiceParameters = {};
  AI_SERVICES.forEach((serviceKey) => {
    const blockTagInfo = getBlockTagInfo(parsedComment, `@${serviceKey}`);
    if (!blockTagInfo) {
      return;
    }
    const { text } = blockTagInfo;
    try {
      // TODO: use something other than JSON to parse this
      const value = JSON.parse(text);
      result[serviceKey] = value;
    } catch (ex) {
      console.warn("Failed to parse ", serviceKey, "tag: ", ex);
    }
  });
  return result;
}

function getBlockTagPosition(parsedComment: ParserContext, tagName: string) {
  const block = getBlockTag(parsedComment, tagName);
  if (!block) {
    return null;
  }

  return {
    start: block.blockTag.getTokenSequence().getContainingTextRange().pos,
    end: block.blockTag.getTokenSequence().getContainingTextRange().end,
  };
}

function getBlockTagInfo(parsedComment: ParserContext, tagName: string) {
  const block = getBlockTag(parsedComment, tagName);
  if (!block) {
    return null;
  }

  return {
    start: block.blockTag.getTokenSequence().getContainingTextRange().pos,
    end: block.blockTag.getTokenSequence().getContainingTextRange().end,
    text: extractPlainText(block.content).trim(),
  };
}

function getBlockTag(parsedComment: ParserContext, tagName: string) {
  const block = parsedComment.docComment.customBlocks.find(
    ({ blockTag }) => blockTag.tagName === tagName
  );
  if (!block) {
    return null;
  }
  return block;
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
