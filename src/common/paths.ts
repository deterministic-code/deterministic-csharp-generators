import { pascalCase } from "change-case";
import pluralize from "pluralize";

const pluralSnake = (entity: string): string => {
  const parts = entity.split(/[_-]/);
  parts[parts.length - 1] = pluralize.plural(parts[parts.length - 1]!);
  return parts.join("_");
};

export type ArtifactPaths = {
  className: (entity: string) => string;
  fileBase: (entity: string) => string;
  fieldName: (field: string) => string;
  filePath: (entity: string) => string;
};

export type ServicePaths = ArtifactPaths & {
  serviceClassName: (entity: string) => string;
  casedFileStem: (stem: string) => string;
  customStubPath: (className: string) => string;
};

export type RoutePaths = {
  className: (entity: string) => string;
  routerClassName: (entity: string) => string;
  filePath: (entity: string) => string;
  customRouteClassName: (name: string) => string;
  customStubPath: (name: string) => string;
  enrichmentClassName: (targetTable: string) => string;
  enrichmentFilePath: (targetTable: string) => string;
};

const core = (
  fileBase: (entity: string) => string,
): Pick<ArtifactPaths, "className" | "fileBase" | "fieldName"> => ({
  className: (entity) => pascalCase(entity),
  fileBase,
  fieldName: (field) => pascalCase(field),
});

export const datasourcePaths = (
  _settings: Record<string, string>,
): ArtifactPaths => {
  const fileBase = (entity: string) => pascalCase(entity);
  return {
    ...core(fileBase),
    filePath: (entity) => `${fileBase(entity)}.cs`,
  };
};

export const viewPaths = datasourcePaths;

export const servicePaths = (
  _settings: Record<string, string>,
): ServicePaths => {
  const fileBase = (entity: string) => pascalCase(`${entity}_service`);
  const casedFileStem = (stem: string) => pascalCase(stem);
  return {
    ...core(fileBase),
    filePath: (entity) => `${fileBase(entity)}.cs`,
    serviceClassName: (entity) => pascalCase(`${entity}_service`),
    casedFileStem,
    customStubPath: (className) => `../custom/${casedFileStem(className)}.cs`,
  };
};

export const routePaths = (
  _settings: Record<string, string>,
): RoutePaths => ({
  className: (entity) => pascalCase(entity),
  routerClassName: (entity) => pascalCase(`${pluralSnake(entity)}_router`),
  filePath: (entity) =>
    `${pascalCase(`${pluralSnake(entity)}_router`)}.cs`,
  customRouteClassName: (name) => pascalCase(`${name}_route`),
  customStubPath: (name) =>
    `../custom/${pascalCase(`${name}_route`)}.cs`,
  enrichmentClassName: (targetTable) =>
    pascalCase(`${targetTable}_name_enrichment`),
  enrichmentFilePath: (targetTable) =>
    `${pascalCase(`${targetTable}_name_enrichment`)}.cs`,
});
