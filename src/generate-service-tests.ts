import { pascalCase } from "change-case";
import { fill } from "@deterministic-code/generators-common/fill";
import type { GenerateContext } from "@deterministic-code/generators-common/generate-context";
import { content, type GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import { createImportGenerator } from "./import-generator.ts";
import { DeterministicParser, SERVICES_YAML, type IDeterministic } from "./specification-parser.ts";
import { genericTmpl } from "./resources/service-tests.ts";

const serviceClassName = (entity: string): string =>
  pascalCase(`${entity}_service`);

const generateFrom = (
  deterministic: IDeterministic,
  settings: Record<string, string>,
): GenerateEntry[] => {
  const imports = createImportGenerator(".", settings);
  return deterministic.services.generics.map((c) =>
    content(
      imports.serviceTest(c.name),
      fill(genericTmpl, {
        testClass: serviceClassName(c.name).replace(/Service$/, "ServiceTests"),
      }),
    ),
  );
};

export const generate = async (
  ctx: GenerateContext,
): Promise<GenerateEntry[]> => {
  await ctx.reader.read(SERVICES_YAML);
  return generateFrom(
    await DeterministicParser(ctx.reader).parse(ctx.settings, {
      serviceClassName,
    }),
    ctx.settings,
  );
};
