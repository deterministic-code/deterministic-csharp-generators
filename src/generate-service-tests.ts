import { fill } from "@deterministic-code/generators-common/fill";
import type { GenerateContext } from "@deterministic-code/generators-common/generate-context";
import { content, type GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import { DeterministicParser, SERVICES_YAML, type IDeterministic } from "./specification-parser.ts";
import { Emit } from "./emit.ts";
import { genericTmpl } from "./resources/service-tests.ts";

class Generator extends Emit {
  from(deterministic: IDeterministic): GenerateEntry[] {
    return deterministic.services.generics.map((c) =>
      content(
        this.imports.serviceTest(c.name),
        fill(genericTmpl, {
          testClass: this.casing.convertTypes(`${c.name}_service_tests`),
        }),
      ),
    );
  }
}

export const generate = async (
  ctx: GenerateContext,
): Promise<GenerateEntry[]> => {
  await ctx.reader.read(SERVICES_YAML);
  const generator = new Generator(ctx.settings);
  return generator.from(
    await DeterministicParser(ctx.reader).parse(ctx.settings, {
      serviceClassName: (entity) => generator.casing.serviceClassName(entity),
    }),
  );
};
