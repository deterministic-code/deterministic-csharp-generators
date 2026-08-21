import { fill } from "@deterministic-code/generators-common/fill";
import type { GenerateContext } from "@deterministic-code/generators-common/generate-context";
import { content, type GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import {
  DeterministicParser,
  ROUTES_YAML,
  type CustomRouteEntry,
  type RouteCandidate,
  type ViewType,
  type IDeterministic,
} from "./specification-parser.ts";
import { Emit } from "./emit.ts";
import {
  customStubTmpl,
  nameEnrichmentTmpl,
  routerTmpl,
} from "./resources/routes.ts";

/** Unique enrichment targets from shaped views (auto-enrich), deduped by table. */
const enrichmentTargets = (
  views: ViewType[],
  survivorNames: Set<string>,
): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const view of views) {
    if (view.kind !== "shaped") continue;
    if (!survivorNames.has(view.name)) continue;
    for (const e of view.enrichments) {
      if (seen.has(e.targetTable)) continue;
      seen.add(e.targetTable);
      out.push(e.targetTable);
    }
  }
  return out;
};

class Generator extends Emit {
  from(deterministic: IDeterministic): GenerateEntry[] {
    const { candidates, customs } = deterministic.routes;
    const survivorNames = new Set(candidates.map((c) => c.name));
    const targets = enrichmentTargets(deterministic.viewTypes, survivorNames);
    return [
      ...candidates.map((c) => this.router(c)),
      ...customs.map((c) => this.custom(c)),
      ...targets.map((t) => this.enrichment(t)),
    ];
  }

  private router(candidate: RouteCandidate): GenerateEntry {
    const className = this.casing.convertTypes(
      this.imports.routeModule(candidate.name),
    );
    return content(
      this.imports.route(candidate.name),
      fill(routerTmpl, {
        simpleDoc: this.settings.simpleDoc,
        descriptionDoc: this.settings.descriptionDoc,
        className,
        interfaceName: `I${className}`,
      }),
    );
  }

  private custom(entry: CustomRouteEntry): GenerateEntry {
    const className = this.casing.convertTypes(`${entry.name}_route`);
    return content(
      this.imports.routeCustom(entry.name),
      fill(customStubTmpl, {
        interfaceName: `I${className}`,
        className,
      }),
    );
  }

  private enrichment(targetTable: string): GenerateEntry {
    const targetPascal = this.casing.convertTypes(targetTable);
    return content(
      this.imports.enrichment(targetTable),
      fill(nameEnrichmentTmpl, {
        className: this.casing.convertTypes(`${targetTable}_name_enrichment`),
        targetPascal,
        targetTable,
        fkProp: this.casing.convertFields(`${targetTable}_id`),
        nameProp: this.casing.convertFields(`${targetTable}_name`),
      }),
    );
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
