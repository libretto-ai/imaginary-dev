/**
 * This function takes a list of items, and comes up with a single name or
 * category that best describes the group as a whole.
 * @openai `{"model": "gpt-3.5-turbo"}`
 *
 * @imaginary
 */
export declare function getNameForList(items: string[]): Promise<string>;

/**
 * This function takes a category name, and a list of items in that category,
 * and returns one more items not in `items`, that would also a member of the named list.
 * @openai `{"model": "gpt-3.5-turbo"}`
 *
 * @imaginary
 */
export declare function getAdditionalItem(
  categoryName: string,
  items: string[]
): Promise<string>;

const functions = {
  getNameForList,
  getAdditionalItem,
};

export default functions;
