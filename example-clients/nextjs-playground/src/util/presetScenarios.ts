import { makeScenario } from "@/state/scenarios";
import { InitialPlaygroundState } from "./playgroundState";

export const presetScenarios: InitialPlaygroundState[] = [
  {
    scenario: makeScenario(
      "emojifier",
      "Emojifier",
      `/**
  * This function takes in a word or phrase and returns a single emoji that represents that concept.
  * @param textToEmojify - textToEmojify the word or phrase to be turned into an emoji
  * @returns a single character emoji
  * @imaginary
  */
  declare function singleEmojiForText(
    textToEmojify: string
  ): Promise<string>;`
    ),
    testCases: [
      {
        name: "Happy",
        id: "sample-1",
        parameterValues: { textToEmojify: "happiness" },
      },
      {
        name: "U2",
        id: "sample-2",
        parameterValues: { textToEmojify: "U2" },
      },
      {
        name: "Basquiat",
        id: "sample-3",
        parameterValues: { textToEmojify: "Basquiat" },
      },
      {
        name: "Dancing",
        id: "sample-4",
        parameterValues: { textToEmojify: "Let's go dancing!" },
      },
    ],
  },
  {
    scenario: makeScenario(
      "database-columns",
      "Database Column Generator",
      `/**
* Get a list of column names for an SQL table named by "tableName", including a
* primary key. If tableDescription is provided, it will be used to improve the suggested columns.
*
* @param tableName The name of the table
* @param tableDescription A description of the type of data stored in the table
* @returns An array of column objects that each include the name, description, and data type
* @imaginary
*/
declare function suggestTableColumns(
 tableName: string,
 tableDescription?: string
): Promise<{ key: string; name: string; description?: string; type: string }[]>;`
    ),
    testCases: [
      {
        name: "Apartments",
        id: "sample-1",
        parameterValues: {
          tableName: "apartments",
          tableDescription:
            "This is a table that describes apartments for rent.",
        },
      },
      {
        name: "Meetings",
        id: "sample-2",
        parameterValues: {
          tableName: "meetings",
          tableDescription:
            "This is a table that describes meetings and appointments.",
        },
      },
      {
        name: "Birds",
        id: "sample-3",
        parameterValues: {
          tableName: "birds",
          tableDescription: "This is a table that describes bird species.",
        },
      },
    ],
  },
  {
    scenario: makeScenario(
      "playlist",
      "Playlist Name Generator",
      `/**
* This function takes in a playlist represented as an array of songs, each represented with artist name and
* song title, and it returns a good name for the playlist that includes all those songs. The playlist name
* should be descriptive and evocative. Good playlist names refer to things like the music genre of the songs in the playlist,
* the mood that the songs in the playlist evoke, the time period the songs in the playlist are from, the people who love the songs
* in the playlist, or themes that unite the songs in the playlist.
* @param songs - an array of songs in the playlist, with artist name and song title
* @returns a good name for the playlist
* @imaginary
* @openai \`{"temperature": 0.75}\`
*/
declare function getPlaylistNameForSongs(songs: { artistName: string; title: string }[]): Promise<string>;`
    ),
    testCases: [
      {
        name: "Dance Music",
        id: "sample-1",
        parameterValues: {
          songs: JSON.stringify([
            { artistName: "Gloria Gaynor", title: "I Will Survive" },
            { artistName: "Lady Gaga", title: "Poker Face" },
            { artistName: "Grace Jones", title: "Pull Up To The Bumper" },
          ]),
        },
      },
      {
        name: "Alt-Country",
        id: "sample-2",
        parameterValues: {
          songs: JSON.stringify([
            { artistName: "Old 97s", title: "Big Brown Eyes" },
            { artistName: "Jay Farrar", title: "Barstow" },
            { artistName: "Neko Case", title: "Thrice All-American" },
          ]),
        },
      },
      {
        name: "80s Hits",
        id: "sample-3",
        parameterValues: {
          songs: JSON.stringify([
            { artistName: "Lionel Richie", title: "All Night Long" },
            { artistName: "Hall & Oates", title: "Maniac" },
            { artistName: "Madonna", title: "Like a Virgin" },
          ]),
        },
      },
    ],
  },
  {
    scenario: makeScenario(
      "muppets",
      "Muppets Casting Agent",
      `/**
* This function takes in the name of a movie and recasts the roles with characters from the
* Muppets. For example, if the movie name is "Star Wars", a good answer would be:
* {
*  "Kermit": "Luke Skywalker",
*  "Miss Piggy": "Princess Leia",
*  "Fozzie Bear": "Han Solo",
* }
* The function returns at least 8 muppets in every answer.
* @param movieName - the name of the movie to re-cast
* @returns an object which is a map of muppet names to roles in the movie
* @imaginary
*/
declare function castMovieWithMuppets(
  movieName: string
): Promise<Record<string, string>>;`
    ),
    testCases: [
      {
        name: "Matrix",
        id: "sample-1",
        parameterValues: {
          movieName: "The Matrix",
        },
      },
      {
        name: "Titanic",
        id: "sample-2",
        parameterValues: {
          movieName: "Titanic",
        },
      },
      {
        name: "Breakfast at Tiffany's",
        id: "sample-3",
        parameterValues: {
          movieName: "Breakfast at Tiffany's",
        },
      },
      {
        name: "Dune",
        id: "sample-4",
        parameterValues: {
          movieName: "Dune",
        },
      },
      {
        name: "Jaws",
        id: "sample-5",
        parameterValues: {
          movieName: "Jaws",
        },
      },
    ],
  },
  {
    scenario: makeScenario(
      "translate-to-spanish",
      "Translate To Spanish",
      `/**
* This function takes in some English text and translates it to Spanish.
* @param englishText - the English text to translate
* @returns an idiomatic translation of the text
* @imaginary
*/
declare function translateToSpanish(
  englishText: string
): Promise<string>;`
    ),
    testCases: [
      {
        name: "How are you?",
        id: "sample-1",
        parameterValues: {
          englishText: "How are you doing?",
        },
      },
      {
        name: "Get directions",
        id: "sample-2",
        parameterValues: {
          englishText:
            "Can you give me directions to the nearest cafe with really delicious coffee?",
        },
      },
    ],
  },
  {
    scenario: makeScenario(
      "generate-name-for-country",
      "Generate Name For Country",
      `/** 
* This should return a human name common to the specified country
* @imaginary 
* @openai \`{"temperature": 1}\`
*/
declare function createUserName(country: string):Promise<string>;`
    ),
    testCases: [
      {
        name: "Hungary",
        id: "sample-1",
        parameterValues: {
          country: "Hungary",
        },
      },
      {
        name: "Norway",
        id: "sample-2",
        parameterValues: {
          country: "Norway",
        },
      },
    ],
  },
  {
    scenario: makeScenario(
      "parse-grocery-list",
      "Parse Grocery List",
      `/**
* This function turns a shopping list into an array of object, where each object is a standard
* grocery item from the list.
*
* @param groceryList - a grocery list. some items might be misspelled or sloppily written
* @returns an array of objects with an optional numeric quantity value, an optional units which
* depicts what the quantity means (units could be things like "pound" or "quart" but also things
* like "loaf" or "bag") and a mandatory name value. The name value should not include a quantity.
* The quantity strings should be full words of common grocery items, not
* abbreviations. The objects returned by this function
* represent every item in the grocery list, spelled correctly, using common words
* that a search engine will understand.
* @imaginary
* @openai \`{"temperature": 0}\`
*/
declare function parseGroceryList(
  groceryList: string
  ): Promise<{ name: string; quantity?: number; units?: string }[]>;`
    ),
    testCases: [
      {
        name: "Grocery List 1",
        id: "sample-1",
        parameterValues: {
          groceryList: "1-loaf Bread, 2-dozen Eggs, 3-pounds Chicken",
        },
      },
    ],
  },
  {
    scenario: makeScenario(
      "extract-names",
      "Extract Names From Email",
      `/**
* This function extracts all of the names of people from an email text and returns them as structured
* information.
*
* @param emailText - the text of an email from which to extract names of people
*
* @returns an array of objects with optional firstName and lastName properties representing the first
* and last names of people mentioned in the email.
* @imaginary
*/
export declare function extractNamesOfPeopleFromEmail(
  emailText: string
): Promise<{ firstName?: string; lastName?: string }[]>;`
    ),
    testCases: [
      {
        name: "Business email",
        id: "sample-1",
        parameterValues: {
          emailText: `Dear Colleagues, 

I'm excited to invite you all to our upcoming meeting. We will be discussing the new project that we've been working on and making sure that everything is on track. 

The meeting will take place on Tuesday, June 1st at 10:00am in the Conference Room. Please make sure to be on time. Attending the meeting will be myself, June Hernandez, Mr. Park, David, and Yolanda.

I'm looking forward to seeing you all there and to having a productive discussion about our project.

Thanks,

Cheri`,
        },
      },
    ],
  },
  //   {
  //     scenario: makeScenario(
  //       "is-fixer-upper",
  //       "Is This Home a Fixer Upper?",
  //       `/**
  // * This function takes in the listing description of a home for sale on a real estate website
  // * and returns an object with a boolean field indicating whether or not this home needs construction work before moving in.
  // * If the listing description indicates that the house needs a lot of work to be livable, this function
  // * returns true for isFixerUpper. If not, it returns false.
  // * @param listingDescription - listing description of a home for sale.
  // * @returns an object with a boolean field called isFixerUpper indicating whether or not the home is a fixer-upper.
  // * @imaginary
  // */
  // declare function isFixerUpper(listingDescription: string): Promise<{isFixerUpper: boolean}>;`
  //     ),
  //     testCases: [
  //       {
  //         name: "Fixer Upper",
  //         id: "sample-1",
  //         parameterValues: {
  //           listingDescription: `This is a prime opportunity for investors looking for a project! Located in the vibrant neighborhood of Bushwick, this 3-level 2-family property is just one block from the L train and three blocks from the G train. Shopping, restaurants, and bars abound in the area, and McCarren Park is only a 7-block walk away.

  //             This property boasts hardwood floors, 5 bedrooms, and 2 full bathrooms. The ground level is a duplex with a separate entrance and access to a 4 bedroom/1 bathroom apartment on the main floor. The second floor apartment consists of 1 bedroom and 1 bathroom. There is potential to expand the property by using approximately 4,050 square feet of additional buildable area.

  //             The real gem of this property is the private backyard with a garden, a feature highly sought after in Bushwick. Please note that the property needs some TLC. It will be delivered vacant at closing. The lot size is 18.75 x 100 feet and the building is 18.75 x 35 feet. The zoning is R6A, R6B, C2-4, with a FAR of 0.84 and a maximum FAR of 3. Taxes are $3,940 per year. Don't miss out on this great opportunity!`,
  //         },
  //       },
  //       {
  //         name: "Not a Fixer Upper",
  //         id: "sample-2",
  //         parameterValues: {
  //           listingDescription: `Welcome home to 545 Market Street, the newest boutique residential condo building offering sophisticated living and shaping the edges of vibrant, soulful Williamsburg, Brooklyn. Located just one and a half blocks from the J train station, this new spacious North facing one-bedroom home is graced by an open floorplan designed for modern living and entertaining. This is complemented by a sleek high-end kitchen featuring white quartz countertops, top-of-the-line Fisher & Paykel and Bosch appliances, and Kohler fixtures. The tranquil bedroom is generously-sized, with ample closet space and a large window. A Luxurious porcelain tiled bathroom will soothe your senses with premium-quality materials and fixtures by Kohler and Toto. Central air conditioning, an in-home washer and dryer, high quality noise resistant windows, and a generously sized private outdoor terrace helps enhance the upscale living experience. 545 Market is made complete by a lovely common roof deck with a BBQ grill, perfect for relaxing or socializing while enjoying expansive Brooklyn and Manhattan skyline views. Also for your convenience is a fully-equipped exercise room, bike storage, and storage for rent. Photos are of the model unit only. THE COMPLETE OFFERING TERMS ARE IN AN OFFERING PLAN AVAILABLE FROM SPONSOR. . Equal Housing Opportunity.`,
  //         },
  //       },
  //     ],
  //   },
  {
    scenario: makeScenario(
      "customer-anger",
      "Customer Anger Level",
      `/**
* This function takes in a customer support email chain and rates the customer's anger or frustration level.
* The possible outputs are "not angry", "mildly frustrated", "very frustrated", or "irate".
* @param customerSupportEmail - the text of a customer support email
* @returns an object with a single attribute: angerLevel. angerLevel can be "not angry", "mildly frustrated", 
* "very frustrated", or "irate" and describes how angry the customer is with the company.
* @imaginary
*/
declare function getCustomerAngerLevel(customerSupportEmail: string): Promise<{angerLevel: "not angry"| "mildly frustrated"| "very frustrated"| "irate"}>;`
    ),
    testCases: [
      {
        name: "Very angry",
        id: "sample-1",
        parameterValues: {
          customerSupportEmail: `This is the worst product I've ever received in my life. I cannot believe you clowns made it.`,
        },
      },
      {
        name: "Mildly frustrated",
        id: "sample-2",
        parameterValues: {
          customerSupportEmail: `Hi there. I bought your product about a month ago, and the handle broke off this morning. I don't think I was being particularly rough with it, and it feels like it should not have broken. Can you help me replace it?`,
        },
      },
    ],
  },
];
