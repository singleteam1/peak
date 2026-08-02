import { spinner } from "@clack/prompts";
import { plainToInstance } from "class-transformer";
import { type ValidationError, validate } from "class-validator";
import { fail, Website } from "common";
import { accent, warn } from "common/constants";
import { LogOutput } from "common/utils";
import type { ICommandEnvironments, ICommandHandler } from "core/types";
import type { IConfig } from "data/config";
import type { IInteractiveService } from "infrastructure";
import type { IConfigService } from "infrastructure/configService/config.service";
import { LoaderPluginArgDto } from "../dto/loader-key-arg.dto";

export class PluginHandler implements ICommandHandler {
  public constructor(
    private readonly configService: IConfigService,
    private readonly interactive: IInteractiveService,
  ) {}

  public async handle(args: any[], env: ICommandEnvironments): Promise<void> {
    let [key, url] = args;
    console.log(key);
    if (!key) {
      key = await this.interactive.prompt("Enter the plugin name");
    }
    if (!url) {
      url = await this.interactive.prompt("Enter the repo url");
    }

    const loader = spinner();
    loader.start("Validating");

    const dto = plainToInstance(LoaderPluginArgDto, {
      key,
      url,
    } as LoaderPluginArgDto);
    const errors = await validate(dto);
    if (errors.length > 0) {
      loader.stop(fail);
      this.renderValidationErrors(errors);
      return;
    }
    const { key: validKey, url: validUrl } = dto;

    const isUrlReferencedToGit = this.validateUrlToGit(validUrl);
    if (!isUrlReferencedToGit) {
      loader.stop(fail);
      LogOutput.LogValidationError("Url is not referenced to git.");
      return;
    }

    loader.message("Updating config");
    const config = await this.configService.getConfig();
    const dublicate = config.projects.find(
      (f) => f.key.toLocaleLowerCase() === validKey.toLocaleLowerCase(),
    );
    if (dublicate) {
      loader.stop(fail);
      LogOutput.LogError("Plugin with this key already exist");
      return;
    }
    const newConfig: IConfig = {
      projects: [
        ...config.projects,
        {
          key: validKey,
          url: validUrl,
        },
      ],
    };
    await this.configService.setConfig(newConfig);
    loader.stop("Success!");
    this.renderSuccessfullMessage();
  }

  public validateUrlToGit(url: string): boolean {
    if (
      !url.startsWith("https://github.com") &&
      !url.startsWith("https://gitlab.com")
    ) {
      return false;
    }
    return true;
  }

  public renderSuccessfullMessage() {
    const headerMessage =
      warn.bold(`\nConfig was successfully reset.`) +
      `\n\n` +
      `Discover ${accent.bold(Website)} to check the documentation\n`;
    console.log(headerMessage);
  }

  public renderValidationErrors(errors: ValidationError[]): void {
    for (const error of errors) {
      if (error.constraints) {
        const messages = Object.values(error.constraints).join(", ");
        LogOutput.LogValidationError(messages);
      }
    }
  }
}
