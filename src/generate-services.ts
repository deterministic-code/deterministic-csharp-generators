import { pascalCase } from "change-case";
import { fill } from "@deterministic-code/generators-common/fill";
import type { GenerateContext } from "@deterministic-code/generators-common/generate-context";
import { content, type GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import {
  createImportGenerator,
  type CsharpImportGenerator,
} from "./import-generator.ts";
import {
  DeterministicParser,
  SERVICES_YAML,
  type CustomServiceEntry,
  type ServiceCandidate,
  type IDeterministic,
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
  imports: CsharpImportGenerator;
  simpleDoc: boolean;
  descriptionDoc: boolean;
};

const emitOptions = (settings: Record<string, string>): EmitOptions => ({
  imports: createImportGenerator(".", settings),
  ...docTokens(settings),
});

const serviceClassName = (entity: string): string =>
  pascalCase(`${entity}_service`);

const renderGeneric = (
  candidate: ServiceCandidate,
  opts: EmitOptions,
): GenerateEntry => {
  const className = serviceClassName(candidate.name);
  return content(
    opts.imports.service(candidate.name),
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
    opts.imports.serviceCustom(entry.name, entry.module),
    fill(customStubTmpl, {
      simpleDoc: opts.simpleDoc,
      descriptionDoc: opts.descriptionDoc,
      interfaceName,
      className,
    }),
  );
};

const generateFrom = (
  deterministic: IDeterministic,
  settings: Record<string, string>,
): GenerateEntry[] => {
  const opts = emitOptions(settings);
  const { generics, customs } = deterministic.services;
  return [
    ...generics.map((c) => renderGeneric(c, opts)),
    ...customs.map((c) => renderCustom(c, opts)),
  ];
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
