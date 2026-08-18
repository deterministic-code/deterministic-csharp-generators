import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { memoryReader } from "./common/deterministic-reader.ts";
import type { GenerateEntry } from "./common/generate-entry.ts";
import { generate } from "./generate-routes.ts";

const DS_YAML = `types:
  - user:
      fields:
        - email:
            type: string
            is_unique: true
            size: 256
        - role_id:
            type: number
            references: role.id
  - role:
      datasource_type: readonly-lookup
      fields:
        - name:
            type: string
            is_unique: true
  - order:
      fields:
        - label:
            type: string
  - order_item:
      fields:
        - order_id:
            type: number
            references: order.id
        - sku:
            type: string
  - internal_sink:
      target: None
      fields:
        - label:
            type: string
`;

const VIEW_YAML = `includes:
  - datasource_types:
      include: "*"
      auto_enrich: true
types: []
`;

const ROUTES_YAML = `includes:
  - view_type_routes:
      filter: 'type is view_type || type is datasource_type'
routes:
  - getReport:
      method: GET
      path: /api/report
      service: ReportService
      serviceMethod: run
combined_routes:
  - order:
      combined_types:
        - order_item
`;

const textOf = (entries: GenerateEntry[], path: string): string => {
  const hit = entries.find((e) => e.kind === "content" && e.filename === path);
  assert.ok(
    hit,
    `missing entry ${path}; got ${entries.map((e) => e.filename).join(", ")}`,
  );
  assert.equal(hit.kind, "content");
  return hit.contents;
};

describe("generate-routes", () => {
  it("emits router stubs, custom stubs, and enrichment helpers", async () => {
    const entries = await generate({
      reader: memoryReader({
        "datasource_types.yaml": DS_YAML,
        "view_types.yaml": VIEW_YAML,
        "routes.yaml": ROUTES_YAML,
      }),
      settings: {},
    });

    const paths = entries.map((e) => e.filename).sort();
    assert.ok(paths.includes("UsersRouter.cs"), `got: ${paths.join(", ")}`);
    assert.ok(paths.includes("RolesRouter.cs"));
    assert.ok(paths.includes("OrdersRouter.cs"));
    assert.ok(!paths.includes("OrderItemsRouter.cs"));
    assert.ok(!paths.includes("InternalSinksRouter.cs"));
    assert.ok(paths.includes("../custom/GetHealthRoute.cs"));
    assert.ok(paths.includes("../custom/GetReportRoute.cs"));
    assert.ok(paths.includes("RoleNameEnrichment.cs"));

    const users = textOf(entries, "UsersRouter.cs");
    assert.match(users, /namespace Routes\.Views;/);
    assert.match(users, /public interface IUsersRouter \{ \}/);
    assert.match(users, /public class UsersRouter : IUsersRouter \{ \}/);

    const roles = textOf(entries, "RolesRouter.cs");
    assert.match(roles, /public class RolesRouter : IRolesRouter/);

    const health = textOf(entries, "../custom/GetHealthRoute.cs");
    assert.match(health, /namespace Routes\.Custom;/);
    assert.match(health, /public class GetHealthRoute : IGetHealthRoute/);

    const enrich = textOf(entries, "RoleNameEnrichment.cs");
    assert.match(enrich, /namespace Routes\.Enrichment;/);
    assert.match(enrich, /public static class RoleNameEnrichment/);
    assert.match(enrich, /EnrichItemsWithRoleNameAsync/);
    assert.match(enrich, /GetProperty\("RoleId"\)/);
  });

  it("emits description doc comments when comments=description", async () => {
    const entries = await generate({
      reader: memoryReader({
        "datasource_types.yaml": DS_YAML,
        "view_types.yaml": VIEW_YAML,
        "routes.yaml": `includes:
  - view_type_routes:
      filter: 'type == "user"'
routes: []
`,
      }),
      settings: { comments: "description" },
    });
    const users = textOf(entries, "UsersRouter.cs");
    assert.match(users, /Datasource type: standard/);
    assert.match(users, /Target: StandardCrud/);
  });

  it("emits simple doc comments by default", async () => {
    const entries = await generate({
      reader: memoryReader({
        "datasource_types.yaml": DS_YAML,
        "view_types.yaml": VIEW_YAML,
        "routes.yaml": `includes:
  - view_type_routes:
      filter: 'type == "user"'
routes: []
`,
      }),
      settings: {},
    });
    const users = textOf(entries, "UsersRouter.cs");
    assert.match(users, /\/\*\* Route UsersRouter\. \*\//);
  });

  it("emits no doc comments when comments=none", async () => {
    const entries = await generate({
      reader: memoryReader({
        "datasource_types.yaml": DS_YAML,
        "view_types.yaml": VIEW_YAML,
        "routes.yaml": `includes:
  - view_type_routes:
      filter: 'type == "user"'
routes: []
`,
      }),
      settings: { comments: "none" },
    });
    const users = textOf(entries, "UsersRouter.cs");
    assert.ok(!users.includes("/**"));
  });
});
