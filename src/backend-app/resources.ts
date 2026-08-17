import { readFile } from "node:fs/promises";

const resource = (rel: string): Promise<string> =>
  readFile(new URL(`../templates/create-backend-app/${rel}`, import.meta.url), "utf8");

export const [
  appCsproj,
  programCs,
  dockerfile,
  appsettingsJson,
  appsettingsDevelopmentJson,
  entrypointSh,
  dockerComposeYml,
  envFile,
  gitignore,
] = await Promise.all([
  resource("csharp/App/App.csproj.tmpl"),
  resource("csharp/App/Program.cs.tmpl"),
  resource("Dockerfile.tmpl"),
  resource("csharp/App/appsettings.json.tmpl"),
  resource("csharp/App/appsettings.Development.json.tmpl"),
  resource("entrypoint.sh"),
  resource("docker-compose.yml.tmpl"),
  resource("env.tmpl"),
  resource("gitignore.tmpl"),
]);
