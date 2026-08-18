import { fill } from "./common/fill.ts";
import type { GenerateContext } from "./common/generate-context.ts";
import { content, type GenerateEntry } from "./common/generate-entry.ts";
import { datasourceSettings } from "./common/datasource-settings.ts";
import { csharpServiceNaming } from "./common/naming.ts";
import { loadServices } from "./common/parse-services.ts";
import { genericTmpl } from "./resources/service-tests.ts";

export const generate = async (
  ctx: GenerateContext,
): Promise<GenerateEntry[]> => {
  const naming = csharpServiceNaming(ctx.settings);
  const { generics } = await loadServices(ctx.reader, {
    idType: datasourceSettings(ctx.settings).idType,
    serviceClassName: naming.serviceClassName,
  });
  return generics.map((c) =>
    content(
      `${naming.casedFileStem(`${c.name}_service_tests`)}.cs`,
      fill(genericTmpl, {
        testClass: naming.serviceClassName(c.name).replace(
          /Service$/,
          "ServiceTests",
        ),
      }),
    ),
  );
};
