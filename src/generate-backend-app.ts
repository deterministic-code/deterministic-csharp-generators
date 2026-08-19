import { fill } from "@deterministic-code/generators-common/fill";
import type { GenerateContext } from "@deterministic-code/generators-common/generate-context";
import { content, patch, type GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import {
  appCsproj,
  appsettingsDevelopmentJson,
  appsettingsJson,
  dockerComposeYml,
  dockerfile,
  entrypointSh,
  envFile,
  gitignore,
  programCs,
} from "./resources/backend-app.ts";

const DEFAULT_APP_NAME = "generated-app";

const projectNameFromAppName = (appName: string): string => {
  const parts = appName
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([0-9])([A-Za-z])/g, "$1 $2")
    .replace(/([A-Za-z])([0-9])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  if (parts.length === 0) return "App";
  const pascal = parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join("");
  return /^[A-Za-z]/.test(pascal) ? pascal : `App${pascal}`;
};

export const generate = async (
  ctx: GenerateContext,
): Promise<GenerateEntry[]> => {
  const projectName = projectNameFromAppName(
    ctx.settings.application_name || DEFAULT_APP_NAME,
  );
  const named = { PROJECT_NAME: projectName };
  return [
    patch(`${projectName}.csproj`, fill(appCsproj, named)),
    patch("Program.cs", programCs),
    content("appsettings.json", appsettingsJson),
    content("appsettings.Development.json", appsettingsDevelopmentJson),
    patch("Dockerfile", fill(dockerfile, named)),
    patch("scripts/entrypoint.sh", entrypointSh),
    patch("docker-compose.yml", dockerComposeYml),
    patch(".env", envFile),
    patch(".env.example", envFile),
    patch(".gitignore", gitignore),
    patch(".dockerignore", "bin/\nobj/", "DOCKERIGNORE_CSHARP"),
  ];
};
