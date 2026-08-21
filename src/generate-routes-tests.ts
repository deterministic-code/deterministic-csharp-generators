import { fill } from "@deterministic-code/generators-common/fill";
import type { GenerateContext } from "@deterministic-code/generators-common/generate-context";
import { content, type GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import { DeterministicParser, ROUTES_YAML, type IDeterministic } from "./specification-parser.ts";
import { Emit } from "./emit.ts";
import { genericTmpl } from "./resources/routes-tests.ts";

class Generator extends Emit {
  from(deterministic: IDeterministic): GenerateEntry[] {
    return deterministic.routes.candidates.map((c) => {
      const testClass = this.casing.convertTypes(
        `${this.imports.routeModule(c.name)}_tests`,
      );
      return content(
        this.imports.routeTest(c.name),
        fill(genericTmpl, { testClass }),
      );
    });
  }
}

export const generate = async (
  ctx: GenerateContext,
): Promise<GenerateEntry[]> => {
  await ctx.reader.read(ROUTES_YAML);
  return new Generator(ctx.settings).from(
    await DeterministicParser(ctx.reader).parse(ctx.settings),
  );
};
