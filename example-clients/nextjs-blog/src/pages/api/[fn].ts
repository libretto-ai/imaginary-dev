import { imaginaryFunctionMap } from "@/blog-ai";
import { makeNextjsMultiHandler } from "@imaginary-dev/nextjs-util/server";
export default makeNextjsMultiHandler(imaginaryFunctionMap, "fn");
