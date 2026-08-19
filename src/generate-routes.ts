import { fill } from "@deterministic-code/generators-common/fill";
import type { GenerateContext } from "@deterministic-code/generators-common/generate-context";
import { content, type GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import {
  routePaths,
  type RoutePaths,
} from "./common/paths.ts";
import {
  SpecificationParser,
  type CustomRouteEntry,
  type RouteCandidate,
} from "./specification-parser.ts";
import {
  customStubTmpl,
  nameEnrichmentTmpl,
  routerTmpl,
} from "./resources/routes.ts";

const docTokens = (settings: Record<string, string>) => {
  const comments = settings["comments"];
  return {
    simpleDoc: comments !== "none" && comments !== "description",
    descriptionDoc: comments === "description",
  };
};

type EmitOptions = {
  naming: RoutePaths;
  simpleDoc: boolean;
  descriptionDoc: boolean;
};

const emitOptions = (settings: Record<string, string>): EmitOptions => ({
  naming: routePaths(settings),
  ...docTokens(settings),
});

const renderRouter = (
  candidate: RouteCandidate,
  opts: EmitOptions,
): GenerateEntry => {
  const className = opts.naming.routerClassName(candidate.name);
  return content(
    opts.naming.filePath(candidate.name),
    fill(routerTmpl, {
      simpleDoc: opts.simpleDoc,
      descriptionDoc: opts.descriptionDoc,
      className,
      interfaceName: `I${className}`,
    }),
  );
};

const renderCustom = (
  entry: CustomRouteEntry,
  opts: EmitOptions,
): GenerateEntry => {
  const className = opts.naming.customRouteClassName(entry.name);
  return content(
    opts.naming.customStubPath(entry.name),
    fill(customStubTmpl, {
      interfaceName: `I${className}`,
      className,
    }),
  );
};

const renderEnrichment = (
  targetTable: string,
  opts: EmitOptions,
): GenerateEntry => {
  const targetPascal = opts.naming.className(targetTable);
  return content(
    opts.naming.enrichmentFilePath(targetTable),
    fill(nameEnrichmentTmpl, {
      className: opts.naming.enrichmentClassName(targetTable),
      targetPascal,
      targetTable,
      fkProp: `${targetPascal}Id`,
      nameProp: `${targetPascal}Name`,
    }),
  );
};

/** Unique enrichment targets from shaped views (auto-enrich), deduped by table. */
const enrichmentTargets = async (
  reader: GenerateContext["reader"],
  survivorNames: Set<string>,
): Promise<string[]> => {
  const views = await new SpecificationParser(reader).loadViewTypes();
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

export const generate = async (
  ctx: GenerateContext,
): Promise<GenerateEntry[]> => {
  const opts = emitOptions(ctx.settings);
  const { candidates, customs } = await new SpecificationParser(ctx.reader).loadRoutes({
    idType: ctx.settings["datasource.id_type"] ?? "integer",
  });
  const survivorNames = new Set(candidates.map((c) => c.name));
  const targets = await enrichmentTargets(ctx.reader, survivorNames);
  return [
    ...candidates.map((c) => renderRouter(c, opts)),
    ...customs.map((c) => renderCustom(c, opts)),
    ...targets.map((t) => renderEnrichment(t, opts)),
  ];
};
