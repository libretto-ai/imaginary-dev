import { defineInlinedReturnTypingTests } from "transformer-shared-tests";

import { TsCompiler } from "./babel-test-compiler";

defineInlinedReturnTypingTests(TsCompiler, false, false);
