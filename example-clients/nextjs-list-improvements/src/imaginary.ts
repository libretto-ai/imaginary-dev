/**
 * This function takes a list of items, and comes up with a single name or
 * category that best describes the group as a whole.
 *
 * @imaginary
 */
export declare function getNameForList(items: string[]): Promise<string>;

/**
 * This function takes a category name, and a list of items in that category,
 * and returns one more item that would be a member of the named list.
 *
 * @imaginary
 */
export declare function getAdditionalItems(
  categoryName: string,
  items: string[]
): Promise<string>;

const functions = {
  getNameForList,
  getAdditionalItems,
};

export default functions;
