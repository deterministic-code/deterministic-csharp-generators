import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { memoryReader } from "@deterministic-code/generators-common/deterministic-reader";
import {
  DATASOURCE_TYPES_YAML,
} from "../src/specification-parser.ts";
import type { GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import { generate } from "../src/generate-datasource-type-validators-tests.ts";

const FIXTURE_YAML = `types:
  - user:
      datasource_type: audit
      fields:
        - email:
            type: string
            size: 256
        - role_id:
            references: role.id
        - nick_name:
            type: string
            is_nullable: true
        - token:
            type: uuid
  - role:
      fields:
        - name:
            type: string
`;

const fixtureReader = () =>
  memoryReader({ [DATASOURCE_TYPES_YAML]: FIXTURE_YAML });

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
  if (entry === undefined) {
    throw new Error(`missing generate entry: ${filename}`);
  }
  return entry;
};

describe("generate datasource type validators tests", () => {
  const generateWith = (settings: Record<string, string> = {}) =>
    generate({
      reader: fixtureReader(),
      settings,
    });

  const userBody = async (settings: Record<string, string> = {}) => {
    const map = indexEntries(await generateWith(settings));
    const userFile = [...map.keys()].find((name) =>
      name.endsWith("UserValidatorTests.cs"),
    );
    assert.ok(userFile, "missing UserValidatorTests.cs generate entry");
    return entryBody(requireEntry(map, userFile));
  };

  it("rejects a missing datasource_types.yaml", async () => {
    await assert.rejects(
      () =>
        generate({
          reader: memoryReader({}),
          settings: {},
        }),
      /missing datasource_types\.yaml/,
    );
  });

  it("emits one validator test file per datasource type", async () => {
    const byName = indexEntries(await generateWith({}));
    assert.deepEqual(
      [...byName.keys()].sort(),
      ["RoleValidatorTests.cs", "UserValidatorTests.cs"],
    );
  });

  it("covers parse, nullable, null, and invalid uuid cases", async () => {
    const user = await userBody();
    assert.match(user, /public void ParsesAValidPayload\(/);
    assert.match(user, /public void AcceptsNullForNullableFields\(/);
    assert.match(user, /public void RejectsNullForEmail\(/);
    assert.match(user, /public void RejectsWhenInvalidUuidOnToken\(/);
    assert.match(user, /new DatasourceUserValidator\(\)\.Validate\(value\)/);
    assert.match(user, /NickName = null/);
    assert.match(user, /Token = "not-a-uuid"/);
  });

  it("writes codegen.schema_version into the file header", async () => {
    const user = await userBody({ "codegen.schema_version": "9.9" });
    assert.match(user, /schema-version: 9.9/);
  });
});
