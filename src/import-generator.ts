import { pascalCase } from "change-case";
import pluralize from "pluralize";
import type { IImportGenerator } from "@deterministic-code/generators-common/import-generator";
import { createCasing, type PackCasing } from "./common/default-casing.ts";

const VARIANT_PREFIXES = ["update_", "create_"] as const;

const featureEntity = (entity: string): string => {
  const prefix = VARIANT_PREFIXES.find((p) => entity.startsWith(p));
  return prefix === undefined ? entity : entity.slice(prefix.length);
};

const pluralSnake = (entity: string): string => {
  const parts = entity.split(/[_-]/);
  parts[parts.length - 1] = pluralize.plural(parts[parts.length - 1]!);
  return parts.join("_");
};

export class CsharpImportGenerator implements IImportGenerator {
  private readonly organizeByFeature: boolean;
  private readonly flat: boolean;
  private readonly basePath: string;
  private readonly casing: PackCasing;

  constructor(basePath: string, settings: Record<string, string>) {
    this.basePath = basePath;
    this.flat = basePath !== "" && basePath !== ".";
    this.organizeByFeature =
      !this.flat && settings["other.organize_by_feature"] === "true";
    this.casing = createCasing(settings);
  }

  datasource(entity: string): string {
    return this.underBase(this.casedFile(entity));
  }

  datasourceRel(entity: string): string {
    return this.datasource(entity);
  }

  datasourceQual(entity: string): string {
    return `Backend.Types.Datasource.${pascalCase(entity)}`;
  }

  datasourceValidator(entity: string): string {
    return this.underBase(`Datasource${pascalCase(entity)}Validator.cs`);
  }

  datasourceValidatorRel(entity: string): string {
    return this.datasourceValidator(entity);
  }

  view(entity: string): string {
    return this.underBase(`${pascalCase(entity)}.cs`);
  }

  viewRel(entity: string): string {
    return this.view(entity);
  }

  viewQual(entity: string): string {
    return `Backend.Types.View.${pascalCase(entity)}`;
  }

  viewValidator(entity: string): string {
    return this.underBase(`${pascalCase(entity)}Validator.cs`);
  }

  viewValidatorRel(entity: string): string {
    return this.viewValidator(entity);
  }

  service(entity: string): string {
    return this.underBase(`${pascalCase(`${entity}_service`)}.cs`);
  }

  serviceRel(entity: string): string {
    return this.service(entity);
  }

  serviceCustom(name: string, _module?: string): string {
    return this.underBase(
      this.organizeByFeature
        ? `Features/${this.casing.directory(featureEntity(name))}/custom/${pascalCase(name)}.cs`
        : `../custom/${pascalCase(name)}.cs`,
    );
  }

  serviceCustomRel(entity: string): string {
    return this.organizeByFeature
      ? `Features/${this.casing.directory(entity)}/custom/${pascalCase(entity)}.cs`
      : `../custom/${pascalCase(entity)}.cs`;
  }

  serviceTest(entity: string): string {
    return this.underBase(
      `${pascalCase(`${entity}_service_tests`)}.cs`,
    );
  }

  serviceTestRel(entity: string): string {
    return this.serviceTest(entity);
  }

  serviceIntegrationTest(entity: string): string {
    return this.serviceTest(entity);
  }

  serviceIntegrationTestRel(entity: string): string {
    return this.serviceIntegrationTest(entity);
  }

  serviceUse(_entity: string, _symbol: string): string {
    return "";
  }

  route(entity: string): string {
    return this.underBase(`${this.routeModule(entity)}.cs`);
  }

  routeRel(entity: string): string {
    return this.route(entity);
  }

  routeCustom(name: string, _module?: string): string {
    return this.underBase(
      this.organizeByFeature
        ? `Features/${this.casing.directory(featureEntity(name))}/custom/${pascalCase(`${name}_route`)}.cs`
        : `../custom/${pascalCase(`${name}_route`)}.cs`,
    );
  }

  routeTest(entity: string): string {
    return this.underBase(`${this.routeModule(entity)}Tests.cs`);
  }

  enrichment(targetTable: string): string {
    return this.underBase(
      `${pascalCase(`${targetTable}_name_enrichment`)}.cs`,
    );
  }

  test(srcFile: string, fileBase: string): string {
    const pascal = pascalCase(fileBase);
    const file = srcFile.includes("Validator")
      ? `${pascal}ValidatorTests.cs`
      : `${pascal}Tests.cs`;
    return this.underBase(file);
  }

  testSpec(_srcFile: string, _fileBase: string): string {
    return "";
  }

  index(_beside: string): string {
    return "";
  }

  spec(_fromFile: string, _toFile: string): string {
    return "Backend.Types.Datasource";
  }

  routeModule(entity: string): string {
    return pascalCase(`${pluralSnake(entity)}_router`);
  }

  appWiring(): string {
    return "";
  }

  validatorFn(
    _kind: "datasource" | "view",
    _entity: string,
    _fn: string,
  ): string {
    return "";
  }

  apiPath(entity: string): string {
    return entity.replace(/_/g, "-");
  }

  private casedFile(entity: string): string {
    const file = `${this.casing.fileBase(entity)}.cs`;
    return this.organizeByFeature
      ? `Features/${this.casing.directory(entity)}/${file}`
      : file;
  }

  private underBase(file: string): string {
    if (!this.flat) return file;
    return `${this.basePath}/${file}`;
  }
}

export const createImportGenerator = (
  basePath: string,
  settings: Record<string, string>,
): CsharpImportGenerator => new CsharpImportGenerator(basePath, settings);
