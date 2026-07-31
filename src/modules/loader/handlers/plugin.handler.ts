import { spinner } from "@clack/prompts";
import { Website } from "common";
import { accent, lime, warn } from "common/constants";
import { isNullOrWhiteSpace, LogOutput } from "common/utils";
import type { ICommandEnvironments, ICommandHandler } from "core/types";
import { configKey, type IConfig, type IProjectData } from "data/config";
import type { ICache } from "infrastructure/cache";
import type { IInteractiveService } from "infrastructure/interactive";

export class PluginHandler implements ICommandHandler {
  public constructor(
    private readonly cache: ICache,
    private readonly interactive: IInteractiveService,
  ) {}

  public async handle(args: any[], env: ICommandEnvironments): Promise<void> {
    const [key, url] = args;

    const validKey = await this.validateKeyArg(key);
    const validUrl = await this.validateUrlArg(url);
    if (!validKey || !validUrl) {
      return;
    }
    const loader = spinner();
    loader.start("Updating config");
    const config = await this.cache.get<string>(configKey);
    const parsedConfig = JSON.parse(config) as Array<IProjectData>;
    const newConfig = [
      ...parsedConfig,
      {
        key: validKey,
        url: validUrl,
      },
    ];
    await this.cache.set(configKey, JSON.stringify(newConfig));
    loader.stop("Success!");
    this.renderSuccessfullMessage();
  }

  private async validateKeyArg(key: string): Promise<string | null> {
    let validKey = key;
    if (isNullOrWhiteSpace(validKey)) {
      validKey = await this.interactive.prompt("Enter the key");
    }
    return validKey;
  }

  private async validateUrlArg(url: string): Promise<string | null> {
    let validUrl = url;
    if (isNullOrWhiteSpace(validUrl)) {
      validUrl = await this.interactive.prompt("Enter the url");
    }

    if (
      !validUrl.startsWith("https://github.com") &&
      !validUrl.startsWith("https://gitlab.com")
    ) {
      LogOutput.LogError("Url is not referenced to git.");
      return null;
    }
    return validUrl;
  }

  private renderSuccessfullMessage() {
    const headerMessage =
      warn.bold(`\nConfig was successfully reset.`) +
      `\n\n` +
      `Discover ${accent.bold(Website)} to check the documentation\n`;
    console.log(headerMessage);
  }
}
