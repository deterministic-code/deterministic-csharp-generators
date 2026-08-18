import { datasourceSettings } from "./common/datasource-settings.ts";
import { commentStyle, type CommentStyle } from "./common/doc-comment.ts";
import { fill } from "./common/fill.ts";
import type { GenerateContext, SettingsDict } from "./common/generate-context.ts";
import { content, type GenerateEntry } from "./common/generate-entry.ts";
import {
  csharpRouteNaming,
  type RouteNaming,
} from "./common/naming.ts";
import {
  loadRoutes,
  type CustomRouteEntry,
  type RouteCandidate,
} from "./common/parse-routes.ts";
import { loadViewTypes } from "./common/parse-view-types.ts";
import { settingsStr } from "./common/settings.ts";
import {
  customStubTmpl,
  nameEnrichmentTmpl,
  routerTmpl,
} from "./routes/resources.ts";

type EmitOptions = {
  naming: RouteNaming;
  style: CommentStyle;
};

const emitOptions = (settings: SettingsDict): EmitOptions => ({
  naming: csharpRouteNaming(settings),
  style: commentStyle(settingsStr(settings, "comments")),
});

const docFlags = (style: CommentStyle) => ({
  simpleDoc: style === "simple",
  descriptionDoc: style === "description",
});

const renderRouter = (
  candidate: RouteCandidate,
  opts: EmitOptions,
): GenerateEntry => {
  const className = opts.naming.routerClassName(candidate.name);
  return content(
    opts.naming.filePath(candidate.name),
    fill(routerTmpl, {
      ...docFlags(opts.style),
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
  const views = await loadViewTypes(reader);
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
  const ds = datasourceSettings(ctx.settings);
  const { candidates, customs } = await loadRoutes(ctx.reader, {
    idType: ds.idType,
  });
  const survivorNames = new Set(candidates.map((c) => c.name));
  const targets = await enrichmentTargets(ctx.reader, survivorNames);
  return [
    ...candidates.map((c) => renderRouter(c, opts)),
    ...customs.map((c) => renderCustom(c, opts)),
    ...targets.map((t) => renderEnrichment(t, opts)),
  ];
};
