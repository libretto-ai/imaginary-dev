import { imaginaryFunctionMap } from "@/emojify";
import { makeNextjsMultiHandler } from "@imaginary-dev/nextjs-util/server";
export default makeNextjsMultiHandler(imaginaryFunctionMap, "fn");
