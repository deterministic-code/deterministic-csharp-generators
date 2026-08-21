import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { memoryReader } from "@deterministic-code/generators-common/deterministic-reader";
import type { GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import { generate } from "../src/generate-services.ts";

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
`;

const VIEW_YAML = `includes:
  - datasource_types:
      include: "*"
types: []
`;

const SERVICES_YAML = `includes:
  - view_type_services:
      filter: 'type is view_type'
services:
  - name: ReportService
`;

const ROUTES_YAML = `routes:
  - getReport:
      method: GET
      path: /api/report
      service: ReportService
      serviceMethod: run
`;

const fixtureReader = (files: Record<string, string>) => memoryReader(files);

const textOf = (entries: GenerateEntry[], path: string): string => {
  const hit = entries.find((e) => e.kind === "content" && e.filename === path);
  assert.ok(hit, `missing entry ${path}`);
  assert.equal(hit.kind, "content");
  return hit.contents;
};

describe("generate-services", () => {
  it("emits empty generic stubs, custom stubs, and health", async () => {
    const entries = await generate({
      reader: fixtureReader({
        "datasource_types.yaml": DS_YAML,
        "view_types.yaml": VIEW_YAML,
        "services.yaml": SERVICES_YAML,
        "routes.yaml": ROUTES_YAML,
      }),
      settings: {},
    });

    const paths = entries
      .map((e) => (e.kind === "content" ? e.filename : e.filename))
      .sort();
    assert.ok(paths.includes("userService.cs"), `got: ${paths.join(", ")}`);
    assert.ok(paths.includes("roleService.cs"));
    assert.ok(paths.includes("../custom/reportService.cs"));
    assert.ok(paths.includes("../custom/healthCheckService.cs"));

    const user = textOf(entries, "userService.cs");
    assert.match(user, /namespace Backend\.Services\.Views;/);
    assert.match(user, /public class UserService \{ \}/);
    assert.ok(!user.includes("findBy"));

    const report = textOf(entries, "../custom/reportService.cs");
    assert.match(report, /namespace Backend\.Services\.Custom;/);
    assert.match(report, /public interface IReportService \{ \}/);
    assert.match(report, /public class ReportService : IReportService \{ \}/);
    assert.ok(!report.includes("run("));

    const health = textOf(entries, "../custom/healthCheckService.cs");
    assert.match(health, /public class HealthCheckService : IHealthCheckService/);
  });

  it("emits description doc comments when comments=description", async () => {
    const entries = await generate({
      reader: fixtureReader({
        "datasource_types.yaml": DS_YAML,
        "view_types.yaml": VIEW_YAML,
        "services.yaml": `includes:
  - view_type_services:
      filter: 'type == "user"'
services: []
`,
      }),
      settings: { comments: "description" },
    });
    const user = textOf(entries, "userService.cs");
    assert.match(user, /Datasource type: standard/);
    assert.match(user, /Target: StandardCrud/);

    const health = textOf(entries, "../custom/healthCheckService.cs");
    assert.match(health, /Target: Custom/);
  });

  it("emits simple doc comments by default", async () => {
    const entries = await generate({
      reader: fixtureReader({
        "datasource_types.yaml": DS_YAML,
        "view_types.yaml": VIEW_YAML,
        "services.yaml": `includes:
  - view_type_services:
      filter: 'type == "user"'
services: []
`,
      }),
      settings: {},
    });
    const user = textOf(entries, "userService.cs");
    assert.match(user, /\/\*\* Service UserService\. \*\//);
  });

  it("emits no doc comments when comments=none", async () => {
    const entries = await generate({
      reader: fixtureReader({
        "datasource_types.yaml": DS_YAML,
        "view_types.yaml": VIEW_YAML,
        "services.yaml": `includes:
  - view_type_services:
      filter: 'type == "user"'
services: []
`,
      }),
      settings: { comments: "none" },
    });
    const user = textOf(entries, "userService.cs");
    assert.ok(!user.includes("/**"));
  });
});
