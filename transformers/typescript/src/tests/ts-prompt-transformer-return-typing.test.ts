import { defineReturnValueTypingTests } from "transformer-shared-tests";

import { TsCompiler } from "./ts-compiler";

defineReturnValueTypingTests(TsCompiler, false);
