import type { ExtensionContext } from "../../core/services/extension/ExtensionContext";
import type { ExtensionModule, ExtensionManifest } from "../../core/types/extension";

import manifest from "./extension.json";
import { blocks, categories } from "./blocks/index";
import { components } from "./components/index";
import { examples } from "./examples/index";

const extManifest = manifest as unknown as ExtensionManifest;

function activate(context: ExtensionContext): void {
  context.registerBlocks(blocks());
  context.registerCategories(categories());
  context.registerComponents(components());
  context.registerExamples(examples());
}

const extension: ExtensionModule = {
  manifest: extManifest,
  activate,
};

export default extension;
export { activate, manifest };
