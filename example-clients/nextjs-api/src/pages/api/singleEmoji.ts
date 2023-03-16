// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { makeNextjsHandler } from "@imaginary-dev/nextjs-util/server";
import { singleEmojiForText } from "../../emojify";

export default makeNextjsHandler(singleEmojiForText);
