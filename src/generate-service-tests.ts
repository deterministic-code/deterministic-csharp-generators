import { fill } from "@deterministic-code/generators-common/fill";
import type { GenerateContext } from "@deterministic-code/generators-common/generate-context";
import { content, type GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import { servicePaths } from "./common/paths.ts";
import { DeterministicParser, SERVICES_YAML, type IDeterministic } from "./specification-parser.ts";
import { genericTmpl } from "./resources/service-tests.ts";

const generateFrom = (
  deterministic: IDeterministic,
  settings: Record<string, string>,
): GenerateEntry[] => {
  const naming = servicePaths(settings);
  return deterministic.services.generics.map((c) =>
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

export const generate = async (
  ctx: GenerateContext,
): Promise<GenerateEntry[]> => {
  await ctx.reader.read(SERVICES_YAML);
  const naming = servicePaths(ctx.settings);
  return generateFrom(
    await DeterministicParser(ctx.reader).parse(ctx.settings, {
      serviceClassName: naming.serviceClassName,
    }),
    ctx.settings,
  );
};
