import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { memoryReader } from "@deterministic-code/generators-common/deterministic-reader";
import type { GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import { generate } from "../src/generate-routes-tests.ts";

const DS_YAML = `types:
  - user:
      fields:
        - email:
            type: string
            is_unique: true
`;

const VIEW_YAML = `includes:
  - datasource_types:
      include: "*"
types: []
`;

const textOf = (entries: GenerateEntry[], path: string): string => {
  const hit = entries.find((e) => e.kind === "content" && e.filename === path);
  assert.ok(hit, `missing entry ${path}`);
  assert.equal(hit.kind, "content");
  return hit.contents;
};

describe("generate-routes-tests", () => {
  it("emits an empty router test class per candidate", async () => {
    const entries = await generate({
      reader: memoryReader({
        "datasource_types.yaml": DS_YAML,
        "view_types.yaml": VIEW_YAML,
        "routes.yaml": `includes:
  - view_type_routes:
      filter: 'type is view_type || type is datasource_type'
routes: []
`,
      }),
      settings: {},
    });
    assert.deepEqual(
      entries.map((e) => e.filename),
      ["usersRouterTests.cs"],
    );
    assert.match(
      textOf(entries, "usersRouterTests.cs"),
      /public class UsersRouterTests/,
    );
  });

  it("emits nothing without view_type_routes", async () => {
    const entries = await generate({
      reader: memoryReader({
        "datasource_types.yaml": DS_YAML,
        "view_types.yaml": VIEW_YAML,
        "routes.yaml": "routes: []\n",
      }),
      settings: {},
    });
    assert.deepEqual(entries, []);
  });
});
