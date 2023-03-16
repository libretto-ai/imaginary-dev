// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { makeNextjsHandler } from "@imaginary-dev/nextjs-util/server";
import { moreEmoji } from "../../emojify";

export default makeNextjsHandler(moreEmoji);
