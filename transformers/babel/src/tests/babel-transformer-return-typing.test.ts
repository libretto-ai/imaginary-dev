import { defineReturnValueTypingTests } from "transformer-shared-tests";

import { TsCompiler } from "./babel-test-compiler";

defineReturnValueTypingTests(TsCompiler, false, false);
