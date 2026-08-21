import { fill } from "@deterministic-code/generators-common/fill";
import type { GenerateContext } from "@deterministic-code/generators-common/generate-context";
import { content, type GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import { createImportGenerator } from "./import-generator.ts";
import { DeterministicParser, ROUTES_YAML, type IDeterministic } from "./specification-parser.ts";
import { genericTmpl } from "./resources/routes-tests.ts";

const generateFrom = (
  deterministic: IDeterministic,
  settings: Record<string, string>,
): GenerateEntry[] => {
  const imports = createImportGenerator(".", settings);
  return deterministic.routes.candidates.map((c) => {
    const testClass = `${imports.routeModule(c.name)}Tests`;
    return content(imports.routeTest(c.name), fill(genericTmpl, { testClass }));
  });
};

export const generate = async (
  ctx: GenerateContext,
): Promise<GenerateEntry[]> => {
  await ctx.reader.read(ROUTES_YAML);
  return generateFrom(
    await DeterministicParser(ctx.reader).parse(ctx.settings),
    ctx.settings,
  );
};
