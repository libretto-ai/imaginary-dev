import { defineMultiFileTests } from "transformer-shared-tests";

import { TsCompiler } from "./ts-compiler";

defineMultiFileTests(TsCompiler, false);
