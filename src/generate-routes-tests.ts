import { fill } from "@deterministic-code/generators-common/fill";
import type { GenerateContext } from "@deterministic-code/generators-common/generate-context";
import { content, type GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import { routePaths } from "./common/paths.ts";
import {
  SpecificationParser,
} from "./specification-parser.ts";
import { genericTmpl } from "./resources/routes-tests.ts";

export const generate = async (
  ctx: GenerateContext,
): Promise<GenerateEntry[]> => {
  const naming = routePaths(ctx.settings);
  const { candidates } = await new SpecificationParser(ctx.reader).loadRoutes({
    idType: ctx.settings["datasource.id_type"] ?? "integer",
  });
  return candidates.map((c) => {
    const testClass = `${naming.routerClassName(c.name)}Tests`;
    return content(`${testClass}.cs`, fill(genericTmpl, { testClass }));
  });
};
