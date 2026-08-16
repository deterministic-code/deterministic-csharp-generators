import {
  emitRoutesFiles,
  dispatchRoutesStep,
  routesStepEmit,
} from "@deterministic-code/generator-sdk/codegen/lib/routes-emit";
import {
  DEFAULT_COMMENT_STYLE,
  renderDocComment,
  type CommentStyle,
} from "@deterministic-code/generator-sdk/emit-doc-comment";
import type { CodegenNames } from "@deterministic-code/generator-sdk/codegen-naming";
import type { CaseFormat } from "@deterministic-code/generator-sdk/case";
import { namesFor } from "@deterministic-code/generator-sdk/codegen/lib/ts-codegen-naming";
import type {
  EmittedFile,
  RoutesEmitConfig,
} from "@deterministic-code/generator-sdk/codegen/lib/routes-emit-types";

interface CsharpEmitOptions {
  fileFormat?: CaseFormat;
  style?: CommentStyle;
  language?: string;
}

interface RouteCandidate {
  name: string;
}

interface EnrichmentDescriptor {
  targetTable: string;
}

type RouteEntry = Record<string, unknown>;

export const DEFAULT_EMIT_OPTIONS: CsharpEmitOptions = {
  fileFormat: "Camel",
  style: DEFAULT_COMMENT_STYLE,
};

const csharpNames = (options: CsharpEmitOptions): CodegenNames =>
  namesFor({ ...DEFAULT_EMIT_OPTIONS, ...options, language: "csharp" });

function emitRouterClass(
  className: string,
  style: CommentStyle = DEFAULT_COMMENT_STYLE,
): string {
  const interfaceName = `I${className}`;
  const descLines = [
    `Route ${className}.`,
    `Datasource type: standard.`,
    `Target: StandardCrud.`,
  ];
  const doc = renderDocComment({
    style,
    summary: `Route ${className}.`,
    lines: descLines,
    language: "csharp",
  });
  return `namespace Routes.Views;

${doc}public interface ${interfaceName} { }

${doc}public class ${className} : ${interfaceName} { }
`;
}

function emitRouterFile(
  candidate: RouteCandidate,
  options: CsharpEmitOptions,
): EmittedFile {
  const { style = DEFAULT_COMMENT_STYLE } = options;
  const names = csharpNames(options);
  const className = `${names.classNamePlural(candidate.name)}Router`;
  const fileBase = names.fileBasePlural(candidate.name, "_router");
  return {
    path: `${fileBase}.cs`,
    content: emitRouterClass(className, style),
  };
}

export function emitReadOnlyRouter(
  candidate: RouteCandidate,
  options: CsharpEmitOptions = {},
): EmittedFile {
  return emitRouterFile(candidate, options);
}

export function emitCrudRouter(
  candidate: RouteCandidate,
  options: CsharpEmitOptions = {},
): EmittedFile {
  return emitRouterFile(candidate, options);
}

export function emitNameEnrichmentHelper(
  { targetTable }: EnrichmentDescriptor,
  options: CsharpEmitOptions = {},
): EmittedFile {
  const names = csharpNames(options);
  const targetPascal = names.className(targetTable);
  const className = `${targetPascal}NameEnrichment`;
  const fkProp = `${targetPascal}Id`;
  const nameProp = `${targetPascal}Name`;
  const fileBase = names.fileBase(targetTable, "enrichment");
  const content = `using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Routes.Enrichment;

public static class ${className}
{
    public static async Task<IList<T>> EnrichItemsWith${targetPascal}NameAsync<T>(
        IList<T> items,
        I${targetPascal}NameSource source)
    {
        if (items.Count == 0) return items;
        var rows = await source.FindAllAsync();
        var map = rows.ToDictionary(r => r.Id, r => r.Name);
        foreach (var item in items)
        {
            var id = (long)(item!.GetType().GetProperty("${fkProp}")!.GetValue(item)!);
            if (!map.TryGetValue(id, out var name))
            {
                throw new InvalidOperationException(
                    $"EnrichItemsWith${targetPascal}NameAsync: no ${targetTable} row for id {id}");
            }
            item.GetType().GetProperty("${nameProp}")?.SetValue(item, name);
        }
        return items;
    }

    public static async Task<T> EnrichItemWith${targetPascal}NameAsync<T>(
        T item,
        I${targetPascal}NameSource source)
    {
        var id = (long)(item!.GetType().GetProperty("${fkProp}")!.GetValue(item)!);
        var row = await source.FindAsync(id)
            ?? throw new InvalidOperationException(
                $"EnrichItemWith${targetPascal}NameAsync: no ${targetTable} row for id {id}");
        item.GetType().GetProperty("${nameProp}")?.SetValue(item, row.Name);
        return item;
    }
}

public interface I${targetPascal}NameSource
{
    Task<IReadOnlyList<${targetPascal}NameRow>> FindAllAsync();
    Task<${targetPascal}NameRow?> FindAsync(long id);
}

public sealed record ${targetPascal}NameRow(long Id, string Name);
`;
  return {
    path: `${fileBase}.cs`,
    content,
  };
}

export function emitCustomRouteStub(
  entry: RouteEntry,
  options: CsharpEmitOptions = {},
): EmittedFile {
  const [name] = Object.keys(entry);
  const names = csharpNames(options);
  const className = `${names.className(name)}Route`;
  const interfaceName = `I${className}`;
  const fileBase = names.customRouteFileBase(name);
  const content = `namespace Routes.Custom;

public interface ${interfaceName} { }

public class ${className} : ${interfaceName} { }
`;
  return { path: `../custom/${fileBase}.cs`, content };
}

/** Catalog `routes` step (csharp). */
export const emit = (ctx: unknown) =>
  routesStepEmit(
    {
      dispatchStep: dispatchRoutesStep,
      emitter: { createEmitter },
      language: "csharp",
    },
    ctx,
  );

export const createEmitter = () => ({
  emit: (config: RoutesEmitConfig) =>
    emitRoutesFiles({
      ...config,
      primitives: {
        emitCrudRouter,
        emitReadOnlyRouter,
        emitCustomRouteStub,
        emitNameEnrichmentHelper,
        nestedRouterEmitters: {},
      },
    }),
});
