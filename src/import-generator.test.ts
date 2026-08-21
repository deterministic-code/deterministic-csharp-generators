import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createImportGenerator } from "./import-generator.ts";

describe("CsharpImportGenerator", () => {
  it("returns Pascal files when organize_by_feature is unset", () => {
    const imports = createImportGenerator(".", {});
    assert.equal(imports.datasource("user"), "user.cs");
    assert.equal(imports.view("card_payment"), "CardPayment.cs");
    assert.equal(imports.service("user"), "UserService.cs");
    assert.equal(imports.route("user"), "UsersRouter.cs");
    assert.equal(imports.datasourceValidator("user"), "DatasourceUserValidator.cs");
    assert.equal(imports.viewValidator("user"), "UserValidator.cs");
    assert.equal(imports.test("User.cs", "user"), "UserTests.cs");
    assert.equal(
      imports.test("UserValidator.cs", "user"),
      "UserValidatorTests.cs",
    );
    assert.equal(
      imports.datasourceQual("user"),
      "Backend.Types.Datasource.User",
    );
    assert.equal(imports.enrichment("role"), "RoleNameEnrichment.cs");
    assert.equal(imports.index("User.cs"), "");
  });

  it("nests datasource files under Features/ when organize_by_feature is true", () => {
    const imports = createImportGenerator(".", {
      "other.organize_by_feature": "true",
      "languages.csharp.casing.file_names": "Pascal",
      "languages.csharp.casing.directories": "Kebab",
    });
    assert.equal(
      imports.datasource("notification_type"),
      "Features/notification-type/NotificationType.cs",
    );
    assert.equal(imports.view("user"), "User.cs");
  });
});
