import * as vscode from "vscode";

export const SECRET_OPENAI_API_KEY = "openaiApiKey";

const globalSecretInfo: SecretInfo[] = [
  {
    key: SECRET_OPENAI_API_KEY,
    prompt: "Enter your OpenAI API Key",
  },
];
export interface SecretInfo {
  key: string;
  prompt: string;
}
export class SecretsProxy {
  context: vscode.ExtensionContext;
  secretInfos: SecretInfo[];

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.secretInfos = globalSecretInfo;
  }
  async getSecretWithoutUserPrompt(
    secretKey: string
  ): Promise<string | undefined> {
    return await this.context.secrets.get(secretKey);
  }

  async getSecret(secretKey: string): Promise<string | undefined> {
    const secret = await this.context.secrets.get(secretKey);
    if (secret === undefined) {
      const value = await this.requestSecret(secretKey);
      return value;
    }
    return secret;
  }
  async clearSecret(secretKey: string): Promise<void> {
    await this.context.secrets.delete(secretKey);
  }

  /** Prompt user for a secret and store the result */
  async requestSecret(secretKey: string) {
    const secretInfo = this.secretInfos.find(({ key }) => key === secretKey);
    const value = await vscode.window.showInputBox({
      prompt: secretInfo?.prompt ?? `Enter a value for "${secretKey}"`,
    });

    if (value) {
      this.context.secrets.store(secretKey, value);
      if (secretKey === SECRET_OPENAI_API_KEY) {
        if (process?.env) {
          (process.env as Record<string, any>).OPENAI_API_KEY = value;
        }
      }
    }
    return value;
  }
}
