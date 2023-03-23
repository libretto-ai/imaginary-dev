import { makeImaginaryNextFunction } from "@imaginary-dev/nextjs-util";

/**
 * This function takes in an incomplete blog post text and returns a concluding paragraph
 * of the blog post, written in the same style, and summing up the main points of the
 * post. It should end with a snappy, memorable line.
 *
 * @param blogPostText - string with the blog post text
 * @returns a paragraph of text that can be added to the end of the blog post to
 * conclude the post.
 * @openai `{"temperature": 0.7}`
 * @imaginary
 */
declare function addConcludingParagraphToBlogPost(
  blogPostText: string
): Promise<string>;

export default makeImaginaryNextFunction(
  addConcludingParagraphToBlogPost,
  "/api/addConcludingParagraphToBlogPost"
);
