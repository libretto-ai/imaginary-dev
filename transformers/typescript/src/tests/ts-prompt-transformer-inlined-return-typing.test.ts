import { defineInlinedReturnTypingTests } from "transformer-shared-tests";

import { TsCompiler } from "./ts-compiler";

defineInlinedReturnTypingTests(TsCompiler, false);
