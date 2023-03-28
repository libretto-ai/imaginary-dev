Imaginary Programming is a way to use AI to define implementation-free functions in TypeScript. When you have installed `imaginary-dev` into your project, you can define a function like this:

```typescript
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
```

And then you can just start calling the function from the rest of your code, without implementing the function at all.

Under the covers, `imaginary-dev` has a compiler plugin that finds imaginary functions like this one and replaces them with runtime calls to OpenAI's GPT. The runtime asks GPT something like "if a function like this existed and I gave it the following arguments, what would the function return?". GPT becomes the runtime engine of your imagined function!

What's more, GPT works in raw text, but you can send in arguments and receive results in any JSON format you desire.

Imaginary Programming is great for classification, finding structure in unstructured text, and generating creative content. See [imaginary.dev](https://imaginary.dev/) for more.

## Installing imaginary-dev for Next.js projects

For Next.js projects, install the `imaginary-dev` Babel compiler plugin and change your Next.js config so that the plugin is used during the build process.

### Installing the dependencies

First, install the necessary dependencies to your project:

```shell
npm install @imaginary-dev/runtime
npm install --save-dev @imaginary-dev/babel-transformer
```

### Adding `imaginary-dev` to your Next.js configuration

Note that `imaginary-dev` is not yet compatible with Next.js projects that use swc as their compiler, which is the default as of Next.js version 12. If you are using swc with the default Next.js setup, you can switch to using Babel just by creating a `.babelrc` or `babel.config.json` file and pasting in the following configuration:

```json
{
  "presets": ["next/babel"],
  "plugins": ["module:@imaginary-dev/babel-transformer"]
}
```

If you already have a `.babelrc` file or are using a version of Next.js before version 12, add `"@imaginary-dev/babel-transformer"` to the plugins array in your `.babelrc` or `babel.config.json` file.

### Adding your OpenAI API key to Next.js

In order to use `imaginary-dev`, you need to get an OpenAI API key and expose it to the `imaginary-dev` library. If you do not have an OpenAI account, go to [www.openai.com](https://www.openai.com/) and sign up. You can then go to the [API keys page](https://platform.openai.com/account/api-keys) to create or copy one of your OpenAI API keys.

In order for `imaginary-dev` to work, your API key should be accessible as an environment variable called `OPENAI_API_KEY`. In Next.js, you can do this easily for your development environment by editing your `.env.local` file (or creating a `.env.local` and editing it if you don't have one). Add a line like:

```env
OPENAI_API_KEY=sk-some-api-key
```

Substitute in your particular OpenAI API key. If you want to learn about other ways you can set environment variables in Next.js, check out [the Next.js documentation on environment variables](https://nextjs.org/docs/basic-features/environment-variables).

### Imaginary functions need to live server-side

OpenAI's API is not intended to be used directly from browsers. If you do so, you will be revealing your OpenAI API key to the world and potentially allow other people to rack up charges on your OpenAI account. For this reason, you should always use the OpenAI API on the server-side and make an API call from your browser frontend to the server. This keeps your API key safe and hidden from potential bad actors.

In Next.js, you can put your imaginary functions into files under `/src/pages/api`, and then use `makeImaginaryNextFunction` to wrap the function and turn it into a server side API call. In browser side code, you can import the API file directly and call the imaginary function as if it were a local async function:

```typescript
// in /pages/api/titleForBlogPost
import { makeImaginaryNextFunction } from "@imaginary-dev/nextjs-util";

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

export default makeImaginaryNextFunction(
  titleForBlogPost,
  "/api/titleForBlogPost"
);
```

```typescript
// in browser code
import { titleForBlogPost } from "./api/titleForBlogPost";

const titles = await titleForBlogPost(someText);
```

## Installing imaginary-dev for Babel projects

For non-Next.js projects that use the Babel compiler, install the `imaginary-dev` Babel compiler plugin and change your Babel config so that the plugin is used.

### Installing the dependencies

First, install the necessary dependencies to your project:

```shell
npm install @imaginary-dev/runtime
npm install --save-dev @imaginary-dev/babel-transformer
```

### Adding `imaginary-dev` to your Babel configuration

Second, add `"@imaginary-dev/babel-plugin-transformer-prompt-js"` to the `plugins` array in your Babel configuration. Your Babel configuration is likely in one of the following places:

- A JSON file called `babel.config.json`, `.babelrc.json`, or `.babelrc`
- Your project's `package.json` under a key named `babel`
- A JavaScript file called `babel.config.js` or `.babelrc.js`
- The CLI argument `--plugins`, if you are using the Babel command line interface
- The second argument to `transformSync` if you have written code to invoke the Babel compiler.

For more information on Babel configuration, see the [Babel documentation on the subject](https://babeljs.io/docs/configuration).

### Adding your OpenAI API key

In order to use `imaginary-dev`, you also need to get an OpenAI API key and expose it to the `imaginary-dev` library. If you do not have an OpenAI account, go to [www.openai.com](https://www.openai.com/) and sign up. You can then go to the [API keys page](https://platform.openai.com/account/api-keys) to create or copy one of your OpenAI API keys.

In order for `imaginary-dev` to work, your API key should be accessible as an environment variable called `OPENAI_API_KEY`.

For running locally on your developer machine you can pass environment variables at the command line, like:

```shell
OPENAI_API_KEY=sk-some-api-key node myfile.js
```

## Installing imaginary-dev for TypeScript projects

For projects that already use the standard TypeScript compiler (`tsc`) as part of their build process, you will need to replace `tsc` with `ttsc` from the excellent `ttypescript` project. `ttsc` is a drop-in replacement for `tsc` that allows the use of compiler plugins, like the one that is required for `imaginary-dev` to run. Replacing `tsc` with `ttsc` will not change the version of TypeScript that you use. You will also need to install the `imaginary-dev` compiler plugin and edit your TypeScript config to use that plugin.

### Installing the dependencies

First, install the necessary dependencies to your project:

```shell
npm install @imaginary-dev/runtime
npm install --save-dev @imaginary-dev/typescript-transformer ttypescript
```

### Swap out `tsc` for `ttsc`

Next, find where in your project `tsc` is invoked as part of your project's build. Commonly, this in an npm script defined in `package.json`. Replace `tsc` with `ttsc` (note the extra "t" at the beginning). For example, if your project is built with the command `npm run build`, look in your `package.json` file, and you'll probably see a line like this:

```json
{
  "scripts": {
    "build": "tsc"
  }
}
```

To swap out the compiler, all you need to do is change that to:

```json
{
  "scripts": {
    "build": "ttsc"
  }
}
```

`ttsc` will pick up your existing TypeScript configuration and support all the same configuration settings as `tsc`.

### Adding `imaginary-dev` to your TypeScript configuration

Third, add the following `plugins` line to the `compilerOptions` section of your `tsconfig.json` file:

```json
{
  "compilerOptions": {
    // add the following line to your tsconfig.json:
    "plugins": [{ "transform": "@imaginary-dev/typescript-transformer" }]
  }
}
```

This tells the compiler to transform imaginary functions when it compiles your code.

### Adding your OpenAI API key

In order to use `imaginary-dev`, you also need to get an OpenAI API key and expose it to the `imaginary-dev` library. If you do not have an OpenAI account, go to [www.openai.com](https://www.openai.com/) and sign up. You can then go to the [API keys page](https://platform.openai.com/account/api-keys) to create or copy one of your OpenAI API keys.

In order for `imaginary-dev` to work, your API key should be accessible as an environment variable called `OPENAI_API_KEY`.

For running locally on your developer machine you can pass environment variables at the command line, like:

```shell
OPENAI_API_KEY=sk-some-api-key node myfile.js
```
