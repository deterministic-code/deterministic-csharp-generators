import {
  camelCase,
  kebabCase,
  pascalCase,
  snakeCase,
} from "change-case";
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
