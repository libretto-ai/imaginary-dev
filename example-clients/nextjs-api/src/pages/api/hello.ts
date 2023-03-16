// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { ApiResponse } from "../../ApiResponse";

/**
 * This function takes in a word or phrase and returns a single emoji that represents that concept.
 * @param textToEmojify - textToEmojify the word or phrase to be turned into an emoji
 * @returns a single character emoji
 * @imaginary
 * @openai `{temperature: 1}`
 */
export declare function singleEmojiForText(
  textToEmojify: string
): Promise<string>;

/**
 * This function takes in a word or sentence and translates it into a series of
 * emojis to represent the meaning of the string.
 *
 * @param textToEmojify - textToEmojify the word or phrase to be turned into an
 *     emoji
 * @returns one or more emojis as a string
 * @imaginary
 */
declare function moreEmoji(textToEmojify: string): Promise<string>;
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const query = Array.isArray(req.query.query)
    ? req.query.query[0]
    : req.query.query;
  const name = query ?? "fred flinstone";
  const [emojified, multiMoji] = await Promise.all([
    singleEmojiForText(name),
    moreEmoji(name),
  ]);

  res.status(200).json({ name, emojified, multiMoji });
}
