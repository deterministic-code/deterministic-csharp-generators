import { fill } from "./common/fill.ts";
import type { GenerateContext } from "./common/generate-context.ts";
import { content, type GenerateEntry } from "./common/generate-entry.ts";
import { datasourceSettings } from "./common/datasource-settings.ts";
import { csharpRouteNaming } from "./common/naming.ts";
import { loadRoutes } from "./common/parse-routes.ts";
import { genericTmpl } from "./resources/routes-tests.ts";

export const generate = async (
  ctx: GenerateContext,
): Promise<GenerateEntry[]> => {
  const naming = csharpRouteNaming(ctx.settings);
  const { candidates } = await loadRoutes(ctx.reader, {
    idType: datasourceSettings(ctx.settings).idType,
  });
  return candidates.map((c) => {
    const testClass = `${naming.routerClassName(c.name)}Tests`;
    return content(`${testClass}.cs`, fill(genericTmpl, { testClass }));
  });
};
