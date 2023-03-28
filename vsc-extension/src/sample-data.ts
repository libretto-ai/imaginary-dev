/**
 * This function takes in a word or phrase and returns a single emoji that represents that concept.
 * @param textToEmojify - textToEmojify the word or phrase to be turned into an emoji
 * @returns a single character emoji
 * @imaginary
 * @openai `{"temperature": 1}`
 */

export declare function singleEmojiForText(
  textToEmojify: string
): Promise<string>;

/**
 * This function takes in a word or sentence and translates it into a series >
 * emojis to represent the meaning of the string.
 *
 * @param textToEmojify - textToEmojify the word or phrase to be turned into >
 *     emoji
 * @returns one or more emojis as a string
 * @imaginary
 */
export declare function moreEmoji(textToEmojify: string): Promise<string>;

export const imaginaryFunctionMap = {
  singleEmojiForText,
  moreEmoji,
};
