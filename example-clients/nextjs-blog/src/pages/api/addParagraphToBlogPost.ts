import { makeImaginaryNextFunction } from "@/next-helpers";

/**
 * This function takes in an incomplete blog post text and returns another paragraph
 * of the blog post, written in the same style, and continuing the general argument or
 * expanding on the topic that was written about up to that point.
 *
 * @param blogPostText - string with the blog post text
 * @returns a paragraph of text that can be added to the end of the blog post to
 * continue the argument and expand upon the topic.
 * @openai `{temperature: 0.7}`
 * @imaginary
 */
declare function addParagraphToBlogPost(blogPostText: string): Promise<string>;

export default makeImaginaryNextFunction(
  addParagraphToBlogPost,
  "/api/addParagraphToBlogPost"
);
