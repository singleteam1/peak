import { spinner } from "@clack/prompts";
import { accent, lime, Website, warn } from "common";
import { LogOutput } from "common/utils";
import type { ICommandEnvironments, ICommandHandler } from "core/types";
import { config, configKey } from "data/config";
import type { ICache } from "infrastructure/cache";
import type { IInteractiveService } from "infrastructure/interactive";

export class ResetHandler implements ICommandHandler {
  public constructor(
    private readonly cache: ICache,
    private readonly interactive: IInteractiveService,
  ) {}

  public async handle(args: any[], env: ICommandEnvironments): Promise<void> {
    const action = await this.interactive.confirmAction(
      "Are you sure you want to reset the config?",
      false,
    );
    if (!action) {
      LogOutput.LogInfo("Cancelling.");
      return;
    }
    const loader = spinner();
    loader.start("Pulling nestjs application");
    const newConfig = JSON.stringify(config);
    await this.cache.set(configKey, newConfig);
    loader.stop("Success!");
    this.renderSuccessfullMessage();
  }

  public renderSuccessfullMessage() {
    const headerMessage =
      warn.bold(`\nConfig was successfully reset.`) +
      `\n\nAdd custom plugins ${lime("peak plugin")}\n\n` +
      `Discover ${accent.bold(Website)} to check the documentation\n`;
    console.log(headerMessage);
  }
}
