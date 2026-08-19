import { fill } from "@deterministic-code/generators-common/fill";
import type { GenerateContext } from "@deterministic-code/generators-common/generate-context";
import { content, type GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import {
  servicePaths,
  type ServicePaths,
} from "./common/paths.ts";
import {
  SpecificationParser,
  type CustomServiceEntry,
  type ServiceCandidate,
} from "./specification-parser.ts";
import { customStubTmpl, genericTmpl } from "./resources/services.ts";

const docTokens = (settings: Record<string, string>) => {
  const comments = settings["comments"];
  return {
    simpleDoc: comments !== "none" && comments !== "description",
    descriptionDoc: comments === "description",
  };
};

type EmitOptions = {
  naming: ServicePaths;
  simpleDoc: boolean;
  descriptionDoc: boolean;
};

const emitOptions = (settings: Record<string, string>): EmitOptions => ({
  naming: servicePaths(settings),
  ...docTokens(settings),
});

const renderGeneric = (
  candidate: ServiceCandidate,
  opts: EmitOptions,
): GenerateEntry => {
  const className = opts.naming.serviceClassName(candidate.name);
  return content(
    opts.naming.filePath(candidate.name),
    fill(genericTmpl, {
      simpleDoc: opts.simpleDoc,
      descriptionDoc: opts.descriptionDoc,
      className,
      datasourceType: candidate.datasourceType ?? "standard",
    }),
  );
};

const renderCustom = (
  entry: CustomServiceEntry,
  opts: EmitOptions,
): GenerateEntry => {
  const className = entry.name;
  const interfaceName = `I${className}`;
  return content(
    opts.naming.customStubPath(entry.name),
    fill(customStubTmpl, {
      simpleDoc: opts.simpleDoc,
      descriptionDoc: opts.descriptionDoc,
      interfaceName,
      className,
    }),
  );
};

export const generate = async (
  ctx: GenerateContext,
): Promise<GenerateEntry[]> => {
  const opts = emitOptions(ctx.settings);
  const { generics, customs } = await new SpecificationParser(ctx.reader).loadServices({
    idType: ctx.settings["datasource.id_type"] ?? "integer",
    serviceClassName: opts.naming.serviceClassName,
  });
  return [
    ...generics.map((c) => renderGeneric(c, opts)),
    ...customs.map((c) => renderCustom(c, opts)),
  ];
};
