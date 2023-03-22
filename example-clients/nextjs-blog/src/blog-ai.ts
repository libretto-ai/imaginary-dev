/**
 * This function takes in a blog post text and returns at least 5 good titles for the blog post.
 * The titles should be snappy and interesting and entice people to click on the blog post.
 *
 * @param blogPostText - string with the blog post text
 * @returns an array of at least 5 good, enticing titles for the blog post.
 *
 * @imaginary
 */
declare function titleForBlogPost(blogPostText: string): Promise<Array<string>>;

/**
 * This function takes in a blog post text and returns at least 5 good tags for the blog post.
 * The tags should be generally applicable blog tags used to categorize blog posts.
 *
 * @param blogPostText - string with the blog post text
 * @returns an array of at least 5 good tags for the blog post.
 *
 * @imaginary
 */
declare function tagsForBlogPost(blogPostText: string): Promise<Array<string>>;

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

/**
 * This function takes in an incomplete blog post text and returns a concluding paragraph
 * of the blog post, written in the same style, and summing up the main points of the
 * post. It should end with a snappy, memorable line.
 *
 * @param blogPostText - string with the blog post text
 * @returns a paragraph of text that can be added to the end of the blog post to
 * conclude the post.
 * @openai `{temperature: 0.7}`
 * @imaginary
 */
declare function addConcludingParagraphToBlogPost(
  blogPostText: string
): Promise<string>;

export const imaginaryFunctionMap = {
  titleForBlogPost,
  tagsForBlogPost,
  addParagraphToBlogPost,
  addConcludingParagraphToBlogPost,
};
