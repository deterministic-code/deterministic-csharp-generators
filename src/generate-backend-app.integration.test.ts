import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { memoryReader } from "@deterministic-code/generators-common/deterministic-reader";
import type { GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import { generate } from "./generate-backend-app.ts";

const entryBody = (entry: GenerateEntry): string => {
  if ("contents" in entry) return String(entry.contents);
  return entry.content;
};

const indexEntries = (entries: GenerateEntry[]): Map<string, GenerateEntry> => {
  const map = new Map<string, GenerateEntry>();
  for (const entry of entries) {
    assert.equal(
      map.has(entry.filename),
      false,
      `duplicate generate entry: ${entry.filename}`,
    );
    map.set(entry.filename, entry);
  }
  return map;
};

const requireEntry = (
  map: Map<string, GenerateEntry>,
  filename: string,
): GenerateEntry => {
  const entry = map.get(filename);
  assert.ok(entry, `missing generate entry: ${filename}`);
  return entry;
};

describe("generate", () => {
  let byName = new Map<string, GenerateEntry>();

  before(async () => {
    byName = indexEntries(
      await generate({
        reader: memoryReader({}),
        settings: { application_name: "catalog-api" },
      }),
    );
  });

  it("emits the flat single-language scaffold", () => {
    assert.deepEqual(
      [...byName.keys()].sort(),
      [
        ".dockerignore",
        ".env",
        ".env.example",
        ".gitignore",
        "CatalogApi.csproj",
        "Dockerfile",
        "Program.cs",
        "appsettings.Development.json",
        "appsettings.json",
        "docker-compose.yml",
        "scripts/entrypoint.sh",
      ],
    );
    for (const filename of byName.keys()) {
      assert.equal(filename.startsWith("csharp/"), false, filename);
      assert.equal(filename.startsWith("backend/"), false, filename);
    }
    const dockerignore = requireEntry(byName, ".dockerignore");
    assert.equal(dockerignore.kind, "patch");
    assert.equal(
      "section" in dockerignore ? dockerignore.section : undefined,
      undefined,
    );
    assert.equal(entryBody(dockerignore), "bin/\nobj/");
  });

  it("renders Program.cs with migrate hook markers", () => {
    const program = entryBody(requireEntry(byName, "Program.cs"));
    assert.equal(requireEntry(byName, "Program.cs").kind, "patch");
    assert.match(program, /BEGIN APP_DB_IMPORTS/);
    assert.match(program, /BEGIN APP_BEFORE_HOOK/);
    assert.match(program, /BEGIN APP_AFTER_HOOK/);
    assert.match(program, /IHealthCheckService/);
  });

  it("renders the csproj for the PascalCase project name", () => {
    const csproj = entryBody(requireEntry(byName, "CatalogApi.csproj"));
    assert.equal(requireEntry(byName, "CatalogApi.csproj").kind, "patch");
    assert.match(csproj, /<RootNamespace>CatalogApi<\/RootNamespace>/);
    assert.match(csproj, /BEGIN DIALECT_PACKAGES/);
  });

  it("copies the project from the image root, not a language lane", () => {
    const dockerfile = entryBody(requireEntry(byName, "Dockerfile"));
    assert.match(dockerfile, /^COPY CatalogApi\.csproj \.\/$/m);
    assert.match(dockerfile, /^COPY \. \.\/$/m);
    assert.doesNotMatch(dockerfile, /csharp\//);
  });

  it("renders a root compose service without a lane dockerfile path", () => {
    const compose = entryBody(requireEntry(byName, "docker-compose.yml"));
    assert.match(compose, /^app:/m);
    assert.match(compose, /HOST_PORT/);
    assert.match(compose, /deterministic\.language=csharp/);
    assert.doesNotMatch(compose, /dockerfile:/);
    assert.doesNotMatch(compose, /csharp\/Dockerfile/);
  });
});
