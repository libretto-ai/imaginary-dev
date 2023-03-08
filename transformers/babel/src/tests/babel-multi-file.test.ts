import { defineMultiFileTests } from "transformer-shared-tests";

import { TsCompiler } from "./babel-test-compiler";

defineMultiFileTests(TsCompiler, false, false);
