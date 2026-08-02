import { pull_handlers } from "./app-pull/app-pull-definitions";
import { loader_handlers } from "./loader/loader-definitions";

export const all_definitions = [...loader_handlers, ...pull_handlers];
