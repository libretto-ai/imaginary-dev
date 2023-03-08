# imaginary-dev

This project has a few parts:

- Plugins for translating imaginary functions into LLM API calls:
  - A TypeScript plugin for transformation, in [transformers/typescript/](transformers/typescript)
  - A Babel plugin for transformation, in [transformers/babel/](transformers/babel)
- A [Playground webapp](example-clients/nextjs-playground)

## Getting Started

1. Use [Volta](https://volta.sh/) to set up the correct version of node and npm
2. Install packages

   npm install

3. Build all packages to make sure they are working.

   npm run build

4. To run the playground locally, make sure to set environment variables (usually in `.env`) to point back to the server:

   OPENAI_API_KEY=<key from https://platform.openai.com/account/api-keys>

You can also add it on the command line in the next step if you want.

5. To start the playground's dev server:

   cd example-clients/nextjs-playground
   npm run dev
