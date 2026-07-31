import { spinner } from "@clack/prompts";
import { Website } from "common";
import { accent, lime, warn } from "common/constants";
import { isNullOrWhiteSpace } from "common/utils";
import type { ICommandEnvironments, ICommandHandler } from "core/types";
import { configKey, type IConfig, type IProjectData } from "data/config";
import type { ICache } from "infrastructure/cache";
import type { IInteractiveService } from "infrastructure/interactive";

export class RemovePluginHandler implements ICommandHandler {
  public constructor(
    private readonly cache: ICache,
    private readonly interactive: IInteractiveService,
  ) {}

  public async handle(args: any[], env: ICommandEnvironments): Promise<void> {
    const [key] = args;

    const validKey = await this.validateKeyArg(key);
    if (!validKey) {
      return;
    }

    const loader = spinner();
    loader.start("Removing project from config");
    const config = await this.cache.get<string>(configKey);
    const parsedConfig = JSON.parse(config) as Array<IProjectData>;
    const filteredConfig = parsedConfig?.filter(f => f.key !== validKey);
    if (filteredConfig) {
      await this.cache.set(configKey, JSON.stringify(filteredConfig));
    }
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

  private renderSuccessfullMessage() {
    const headerMessage =
      warn.bold(`\nConfig was successfully updated.`) +
      `\n\nAdd custom plugins ${lime("peak plugin")}\n\n` +
      `Discover ${accent.bold(Website)} to check the documentation\n`;
    console.log(headerMessage);
  }
}
