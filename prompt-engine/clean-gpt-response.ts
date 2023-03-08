import { JSONSchema7 } from "json-schema";
import peggy from "peggy";
import { getJSONSchemaType } from "./json-schema-util";

export default function cleanGptResponse(
  gptResponse: string,
  schema: JSONSchema7
): string | null {
  let cleanedResponse = gptResponse;

  // when we ask for just a simple string (i.e. top-level JSON schema is just {type: string}),
  // sometimes GPT decides not to return the answer with quotes. But without quotes, the JSON parser
  // won't understand it.
  //   if (
  //     isTopLevelStringType(schema) &&
  //     // TODO: deal with strings that start with ' and end with ", and vice versa
  //     !cleanedResponse.startsWith('"') &&
  //     !cleanedResponse.startsWith("'") &&
  //     !cleanedResponse.endsWith('"') &&
  //     !cleanedResponse.endsWith("'")
  //   ) {
  //     cleanedResponse = JSON.stringify(cleanedResponse);
  //   }
  const jsonResult = lenientlyParseJson(cleanedResponse);
  const valueType = getWrappedValueType(schema);
  if (valueType) {
    if (typeof jsonResult.value !== valueType) {
      throw new Error(
        `Could not parse ${typeof jsonResult.value} as ${
          schema.type ?? schema.const
        }`
      );
    }
    return jsonResult.value;
  }
  return jsonResult;
}

/**
 * Get the primitive JS type name for the type in the JSON Schema object
 */
export function getWrappedValueType(
  schema: JSONSchema7
): "number" | "boolean" | "object" | "string" | null {
  const schemaType = getJSONSchemaType(schema);
  if (
    schemaType === "number" ||
    schemaType === "integer" ||
    (schema.enum?.length && schema.enum.every((e) => typeof e === "number"))
  ) {
    return "number";
  }
  if (
    schemaType === "boolean" ||
    (schema.enum?.length && schema.enum.every((e) => typeof e === "boolean"))
  ) {
    return "boolean";
  }
  if (isSchemaForNull(schema)) {
    return "object";
  }
  if (
    schemaType === "string" ||
    (schema.enum?.length && schema.enum.every((e) => typeof e === "string"))
  ) {
    return "string";
  }
  return null;
}

export function isSchemaForNull(schema: JSONSchema7) {
  return schema?.type === "null" || schema.const === null;
}

function isTopLevelStringType(schema: JSONSchema7): boolean {
  if (schema?.type === "string") return true;
  if (typeof schema?.const === "string") return true;
  if (schema?.enum?.length) {
    return schema.enum.every((enumItem) => typeof enumItem === "string");
  }
  if (schema?.anyOf) {
    return !!schema?.anyOf?.map(isTopLevelStringType);
  }
  return false;
}

function lenientlyParseJson(input: string): any {
  return parser.parse(input);
}

const parser = peggy.generate(`
start =
    JSON5Text

// added by Sasha to handle white space
IgnorableWhiteSpace = 
    (WhiteSpace / LineTerminator)*

// JSON5 Syntactic Grammar
// https://spec.json5.org/#syntactic-grammar
JSON5Text =
    JSON5Value

JSON5Value =
    IgnorableWhiteSpace 
    @(
        JSON5Null /
        JSON5Boolean /
        JSON5String /
        JSON5Number /
        JSON5Object /
        JSON5Array 
    )
    IgnorableWhiteSpace 

JSON5Object =
    "{}" { return {}; } /
    "{" members:JSON5MemberList ","? IgnorableWhiteSpace "}" { return Object.fromEntries(members.filter(item => item !== null)); }

// added to the grammar to handle missing commas
JSON5TrailingMember = 
    "," @JSON5Member /
    IgnorableWhiteSpace @JSON5Member

// spec compliant (i.e. commas every time) would be: head:JSON5Member rest:("," @JSON5Member)* { return [head, ...rest]; }
JSON5MemberList =
    head:JSON5Member rest:(JSON5TrailingMember)* { return [head, ...rest]; } 

// this was modified from the JSON5 grammar to add "undefined"
JSON5Member =
    name:JSON5MemberName ":" (WhiteSpace / LineTerminator)* value:(JSON5Value / IgnorableWhiteSpace @"undefined" IgnorableWhiteSpace) { return value === "undefined" ? null : [name, value]; }

JSON5MemberName =
    (WhiteSpace / LineTerminator)*  @JSON5Identifier (WhiteSpace / LineTerminator)*  /
    (WhiteSpace / LineTerminator)* @JSON5String (WhiteSpace / LineTerminator)*

JSON5Array =
    "[]" { return []; } /
    "[" @JSON5ElementList (",")? IgnorableWhiteSpace "]"

JSON5ElementList =
    head:JSON5Value rest:("," @JSON5Value)* { return [head, ...rest]; }

// JSON5 Lexical Grammar
// https://spec.json5.org/#lexical-grammar

// this is part of the grammar but is not really used so I comment it out.
// JSON5SourceCharacter::
// SourceCharacter

JSON5InputElement =
    WhiteSpace /
    LineTerminator /
    Comment /
    JSON5Token

JSON5Token =
    JSON5Identifier
    JSON5Punctuator
    JSON5String
    JSON5Number

JSON5Identifier =
    IdentifierName


JSON5Punctuator =
    [{}\\[\\]:,]

JSON5Null =
    NullLiteral

JSON5Boolean =
    BooleanLiteral

JSON5String =
    '"' chars:JSON5DoubleStringCharacters? '"' { return chars?.join("") ?? ""; } /
    "'" chars:JSON5SingleStringCharacters? "'" { return chars?.join("") ?? ""; } /
    "“" chars:JSON5CurlyDoubleStringCharacters? "”" { return chars?.join("") ?? ""} /
    "‘" chars:JSON5CurlySingleStringCharacters? "’" { return chars?.join("") ?? ""}

// Original definition was "JSON5DoubleStringCharacter JSON5DoubleStringCharacters opt"
JSON5DoubleStringCharacters =
    JSON5DoubleStringCharacter+

// Original definition was "JSON5SingleStringCharacter JSON5SingleStringCharacters opt"
JSON5SingleStringCharacters =
    JSON5SingleStringCharacter+
    
// Added to the grammar to deal with double smart quotes. https://github.com/aickin/prompt-js/issues/112
JSON5CurlyDoubleStringCharacters =
    JSON5CurlyDoubleStringCharacter+
        
// Added to the grammar to deal with single smart quotes. https://github.com/aickin/prompt-js/issues/112
JSON5CurlySingleStringCharacters =
    JSON5CurlySingleStringCharacter+
            
// first rule was "SourceCharacterbut not one of " or \ or LineTerminator"
JSON5DoubleStringCharacter =
    $[^"\\u000A\\u000D\\u2028\\u2029\\\\] /
    "\\\\" @EscapeSequence /
    LineContinuation { return ""; } /
    "\\u2028" { return "\\u2028"; } /
    "\\u2029" { return "\\u2029"; }

// first rule was "SourceCharacter but not one of ' or \ or LineTerminator"
JSON5SingleStringCharacter =
    $[^'\\u000A\\u000D\\u2028\\u2029\\\\] /
    "\\\\" @EscapeSequence /
    LineContinuation { return ""; } /
    "\\u2028" { return "\\u2028"; } /
    "\\u2029" { return "\\u2029"; }

// added to the grammar to deal with curly double quotes. https://github.com/aickin/prompt-js/issues/112
JSON5CurlyDoubleStringCharacter =
    $[^”\\u000A\\u000D\\u2028\\u2029\\\\] /
    "\\\\" @EscapeSequence /
    LineContinuation { return ""; } /
    "\\u2028" { return "\\u2028"; } /
    "\\u2029" { return "\\u2029"; }

// added to the grammar to deal with curly single quotes. https://github.com/aickin/prompt-js/issues/112
JSON5CurlySingleStringCharacter =
    $[^’\\u000A\\u000D\\u2028\\u2029\\\\] /
    "\\\\" @EscapeSequence /
    LineContinuation { return ""; } /
    "\\u2028" { return "\\u2028"; } /
    "\\u2029" { return "\\u2029"; }
    
JSON5Number =
    JSON5NumericLiteral /
    "+" number:JSON5NumericLiteral { return number; } /
    "-" number:JSON5NumericLiteral { return -1 * number; }

JSON5NumericLiteral =
    NumericLiteral /
    "Infinity" { return Infinity; } /
    "NaN" { return NaN; }

// ECMAScript Null literal
// https://262.ecma-international.org/5.1/#sec-7.8.1
NullLiteral =
    "null" { return null; }

// ECMAScript Boolean literals
// https://262.ecma-international.org/5.1/#sec-7.8.2
BooleanLiteral =
    "true" { return true; } /
    "false" { return false; }

// ECMAScript String literals
// https://262.ecma-international.org/5.1/#sec-7.8.4

StringLiteral =
'"' chars:DoubleStringCharacters? '"' { return chars?.join("") ?? ""; } /
"'" chars:SingleStringCharacters? "'" { return chars?.join("") ?? ""; }

// defintition was "DoubleStringCharacter DoubleStringCharacters opt"
DoubleStringCharacters =
DoubleStringCharacter+

// definition was "SingleStringCharacter SingleStringCharacters opt"
SingleStringCharacters =
SingleStringCharacter+

// description in official grammar of first rule is "SourceCharacter but not one of " or \ or LineTerminator"
DoubleStringCharacter =
    $[^"\\u000A\\u000D\\u2028\\u2029\\\\] /
    "\\\\" @EscapeSequence /
    LineContinuation { return ""; }

// description in official grammar of first rule is "SourceCharacter but not one of ' or \ or LineTerminator"
SingleStringCharacter =
    $[^'\\u000A\\u000D\\u2028\\u2029\\\\] /
    "\\\\" @EscapeSequence /
    LineContinuation

LineContinuation =
    "\\\\" LineTerminatorSequence { return ""; }

// second rule was "0 [lookahead ∉ DecimalDigit]"
EscapeSequence =
    CharacterEscapeSequence /
    "0" !DecimalDigit { return "\\u0000"; } /
    HexEscapeSequence /
    UnicodeEscapeSequence

CharacterEscapeSequence =
    SingleEscapeCharacter { 
        switch (text()) {
            case "b": return "\\u0008";
            case "t": return "\\u0009";
            case "n": return "\\u000A";
            case "v": return "\\u000B";
            case "f": return "\\u000C";
            case "r": return "\\u000D";
            default: return text();
        }
    } /
    NonEscapeCharacter

SingleEscapeCharacter =
    ['"\\\\bfnrtv]

// description in official grammar is "SourceCharacter but not one of EscapeCharacter or LineTerminator"
NonEscapeCharacter =
    $[^'"\\\\bfnrtv0-9xu\\u000A\\u000D\\u2028\\u2029"]

EscapeCharacter =
    SingleEscapeCharacter /
    DecimalDigit /
    "x" /
    "u"

HexEscapeSequence =
    "x" digit1:HexDigit digit2:HexDigit { return String.fromCharCode(parseInt(digit1 + digit2, 16)); }

UnicodeEscapeSequence =
    "u" digit1:HexDigit digit2:HexDigit digit3:HexDigit digit4:HexDigit { return String.fromCharCode(parseInt(digit1 + digit2 + digit3 + digit4, 16)); }


// Numeric Literals
// https://262.ecma-international.org/5.1/#sec-7.8.3
NumericLiteral =
    DecimalLiteral /
    HexIntegerLiteral

DecimalLiteral =
    DecimalIntegerLiteral "." DecimalDigits? ExponentPart? { return parseFloat(text())} /
    "." DecimalDigits ExponentPart?  {return parseFloat(text())} /
    number:DecimalIntegerLiteral exponent:ExponentPart? { return parseInt(text()) * Math.pow(10, exponent ?? 0)}

DecimalIntegerLiteral =
    "0" { return 0; } /
    NonZeroDigit DecimalDigits? { return parseInt(text()); }

// modified from grammar: substituted + for recursion.
DecimalDigits =
    DecimalDigit+ { return parseInt(text()); }

DecimalDigit =
    [0-9]

NonZeroDigit =
    [1-9]

ExponentPart =
    ExponentIndicator @SignedInteger

ExponentIndicator =
    "e" / "E"

SignedInteger =
    DecimalDigits /
    "+" number:DecimalDigits { return number; } /
    "-" number:DecimalDigits { return -1 * number; }

// modified from grammar: substituted + for recursion.
HexIntegerLiteral =
    "0x" HexDigit+ /
    "0X" HexDigit+ 

HexDigit =
   [0-9a-fA-F]

// Identifier Names
// https://262.ecma-international.org/5.1/#sec-7.6

// definition is "IdentifierName but not ReservedWord"; I'm not excluding ReservedWord yet
Identifier =
    $IdentifierName

IdentifierName =
    $(IdentifierStart IdentifierPart*)

IdentifierStart =
    UnicodeLetter /
    "$" /
    "_" /
    "\\\\" UnicodeEscapeSequence

// the last two of these rules in the grammar are "<ZWNJ>" and "<ZWJ>"
IdentifierPart =
    IdentifierStart /
    UnicodeCombiningMark /
    UnicodeDigit /
    UnicodeConnectorPunctuation /
    "\\u200C" /
    "\\u200D"

// any character in the Unicode categories “Uppercase letter (Lu)”, “Lowercase letter (Ll)”, “Titlecase letter (Lt)”, “Modifier letter (Lm)”, “Other letter (Lo)”, or “Letter number (Nl)”.
UnicodeLetter =
    @char:. &{ return !!char.match(\/\\p{Lu}\/u) || !!char.match(\/\\p{Ll}\/u) || !!char.match(\/\\p{Lt}\/u) || !!char.match(\/\\p{Lm}\/u) || !!char.match(\/\\p{Lo}\/u) || !!char.match(\/\\p{Nl}\/u); }

// any character in the Unicode categories “Non-spacing mark (Mn)” or “Combining spacing mark (Mc)”
UnicodeCombiningMark =
    @char:. &{ return !!char.match(\/\\p{Mn}\/u) || !!char.match(\/\\p{Mc}\/u); }

// any character in the Unicode category “Decimal number (Nd)”
UnicodeDigit =
    @char:. &{ return !!char.match(\/\\p{Nd}\/u); }

// any character in the Unicode category “Connector punctuation (Pc)”
UnicodeConnectorPunctuation =
    @char:. &{ return !!char.match(\/\\p{Pc}\/u); }

// Comments
// https://262.ecma-international.org/5.1/#sec-7.4
Comment =
    MultiLineComment /
    SingleLineComment

MultiLineComment =
    "\/*" MultiLineCommentChars? "*\/"

MultiLineCommentChars =
    MultiLineNotAsteriskChar MultiLineCommentChars? /
    "*" PostAsteriskCommentChars?

PostAsteriskCommentChars =
    MultiLineNotForwardSlashOrAsteriskChar MultiLineCommentChars? /
    "*" PostAsteriskCommentChars?

// original definition is "SourceCharacter but not *"
MultiLineNotAsteriskChar =
    [^*]

// original definition is "SourceCharacter but not one of / or *"
MultiLineNotForwardSlashOrAsteriskChar =
    [^\\/*]

SingleLineComment =
"\/\/" SingleLineCommentChars?

// original definition is "SingleLineCommentChar SingleLineCommentChars opt"
SingleLineCommentChars =
    SingleLineCommentChar+

// original definition is "SourceCharacter but not LineTerminator"
SingleLineCommentChar =
    [^\\u000A\\u000D\\u2028\\u2029]

// ECMAScript Line Terminators
// https://262.ecma-international.org/5.1/#sec-7.3
LineTerminator =
    "\\u000A" / "\\u000D" / "\\u2028" / "\\u2029"

LineTerminatorSequence = 
    "\\u000A" / "\\u000D" !"\\u000A" / "\\u2028" / "\\u2029" / "\\u000D" "\\u000A"


// ECMAScript White Space
// https://262.ecma-international.org/5.1/#sec-7.2
WhiteSpace =
    "\\u0009" / "\\u000B" / "\\u000C" / "\\u0020" / "\\u00A0" / "\\uFEFF" /
    @char:. &{ return !!char.match(\/\\p{Zs}\/u); }

    `);
