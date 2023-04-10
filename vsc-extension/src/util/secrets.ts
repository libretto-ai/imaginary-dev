import * as vscode from "vscode";

export interface SecretInfo {
  key: string;
  prompt: string;
}
export class SecretsProxy {
  context: vscode.ExtensionContext;
  secretInfos: SecretInfo[];

  constructor(context: vscode.ExtensionContext, secretInfos: SecretInfo[]) {
    this.context = context;
    this.secretInfos = secretInfos;
  }
  async getSecret(secretKey: string): Promise<string | undefined> {
    const secret = await this.context.secrets.get(secretKey);
    if (secret === undefined) {
      const value = await this.requestSecret(secretKey);
      return value;
    }
    return secret;
  }

  /** Prompt user for a secret and store the result */
  async requestSecret(secretKey: string) {
    const secretInfo = this.secretInfos.find(({ key }) => key === secretKey);
    const value = await vscode.window.showInputBox({
      prompt: secretInfo?.prompt ?? `Enter a value for "${secretKey}"`,
    });

    if (value) {
      this.context.secrets.store(secretKey, value);
    }
    return value;
  }
}
