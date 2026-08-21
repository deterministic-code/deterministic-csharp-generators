import { fill } from "@deterministic-code/generators-common/fill";
import type { GenerateContext } from "@deterministic-code/generators-common/generate-context";
import { content, type GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import {
  DeterministicParser,
  SERVICES_YAML,
  type CustomServiceEntry,
  type ServiceCandidate,
  type IDeterministic,
} from "./specification-parser.ts";
import { Emit } from "./emit.ts";
import { customStubTmpl, genericTmpl } from "./resources/services.ts";

class Generator extends Emit {
  from(deterministic: IDeterministic): GenerateEntry[] {
    const { generics, customs } = deterministic.services;
    return [
      ...generics.map((c) => this.generic(c)),
      ...customs.map((c) => this.custom(c)),
    ];
  }

  private generic(candidate: ServiceCandidate): GenerateEntry {
    const className = this.casing.serviceClassName(candidate.name);
    return content(
      this.imports.service(candidate.name),
      fill(genericTmpl, {
        simpleDoc: this.settings.simpleDoc,
        descriptionDoc: this.settings.descriptionDoc,
        className,
        datasourceType: candidate.datasourceType ?? "standard",
      }),
    );
  }

  private custom(entry: CustomServiceEntry): GenerateEntry {
    const className = this.casing.convertTypes(entry.name);
    const interfaceName = `I${className}`;
    return content(
      this.imports.serviceCustom(entry.name, entry.module),
      fill(customStubTmpl, {
        simpleDoc: this.settings.simpleDoc,
        descriptionDoc: this.settings.descriptionDoc,
        interfaceName,
        className,
      }),
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
