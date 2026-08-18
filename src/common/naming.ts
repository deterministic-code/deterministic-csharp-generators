import {
  camelCase,
  kebabCase,
  pascalCase,
  snakeCase,
} from "change-case";
import pluralize from "pluralize";
import type { SettingsDict } from "./generate-context.ts";
import { settingsStr } from "./settings.ts";

type Convert = (name: string) => string;

const CONVERT: Record<string, Convert> = {
  camel: camelCase,
  pascal: pascalCase,
  snake: snakeCase,
  kebab: kebabCase,
};

const convertFor = (
  settings: SettingsDict,
  key: string,
  fallback: Convert,
): Convert => {
  const raw = settingsStr(settings, key)?.toLowerCase();
  if (!raw || raw === "auto") return fallback;
  return CONVERT[raw] ?? fallback;
};

export type ArtifactNaming = {
  className: (entity: string) => string;
  fieldName: (field: string) => string;
  filePath: (entity: string) => string;
};

export type ServiceNaming = ArtifactNaming & {
  serviceClassName: (entity: string) => string;
  fileBase: (entity: string) => string;
  casedFileStem: (stem: string) => string;
  customStubPath: (className: string) => string;
};

export const csharpNaming = (settings: SettingsDict): ArtifactNaming => {
  const fileCase = convertFor(
    settings,
    "languages.csharp.casing.file_names",
    pascalCase,
  );
  const classCase = convertFor(
    settings,
    "languages.csharp.casing.types",
    pascalCase,
  );
  const fieldCase = convertFor(
    settings,
    "languages.csharp.casing.fields",
    pascalCase,
  );
  return {
    className: (entity) => classCase(entity),
    fieldName: (field) => fieldCase(field),
    filePath: (entity) => `${fileCase(entity)}.cs`,
  };
};

/** Flat service paths only (no by-feature layout in the C# pack). */
export const csharpServiceNaming = (
  settings: SettingsDict,
): ServiceNaming => {
  const fileCase = convertFor(
    settings,
    "languages.csharp.casing.file_names",
    pascalCase,
  );
  const classCase = convertFor(
    settings,
    "languages.csharp.casing.types",
    pascalCase,
  );
  const fieldCase = convertFor(
    settings,
    "languages.csharp.casing.fields",
    pascalCase,
  );
  const fileBase = (entity: string) => fileCase(`${entity}_service`);
  const casedFileStem = (stem: string) => fileCase(stem);
  return {
    className: (entity) => classCase(entity),
    fieldName: (field) => fieldCase(field),
    fileBase,
    filePath: (entity) => `${fileBase(entity)}.cs`,
    serviceClassName: (entity) => classCase(`${entity}_service`),
    casedFileStem,
    customStubPath: (className) => `../custom/${casedFileStem(className)}.cs`,
  };
};

const pluralSnake = (entity: string): string => {
  const parts = entity.split(/[_-]/);
  parts[parts.length - 1] = pluralize.plural(parts[parts.length - 1]!);
  return parts.join("_");
};

export type RouteNaming = {
  className: (entity: string) => string;
  routerClassName: (entity: string) => string;
  filePath: (entity: string) => string;
  customRouteClassName: (name: string) => string;
  customStubPath: (name: string) => string;
  enrichmentClassName: (targetTable: string) => string;
  enrichmentFilePath: (targetTable: string) => string;
};

/** Flat route paths only (no by-feature layout in the C# pack). */
export const csharpRouteNaming = (settings: SettingsDict): RouteNaming => {
  const fileCase = convertFor(
    settings,
    "languages.csharp.casing.file_names",
    pascalCase,
  );
  const classCase = convertFor(
    settings,
    "languages.csharp.casing.types",
    pascalCase,
  );
  return {
    className: (entity) => classCase(entity),
    routerClassName: (entity) => classCase(`${pluralSnake(entity)}_router`),
    filePath: (entity) => `${fileCase(`${pluralSnake(entity)}_router`)}.cs`,
    customRouteClassName: (name) => classCase(`${name}_route`),
    customStubPath: (name) => `../custom/${fileCase(`${name}_route`)}.cs`,
    enrichmentClassName: (targetTable) =>
      classCase(`${targetTable}_name_enrichment`),
    enrichmentFilePath: (targetTable) =>
      `${fileCase(`${targetTable}_name_enrichment`)}.cs`,
  };
};
