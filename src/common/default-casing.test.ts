import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCasing, DEFAULT_CASING } from "./default-casing.ts";

const NAME = "notification_type";

describe("createCasing Auto defaults", () => {
  it("matches Default Casings for C#", () => {
    assert.deepEqual(DEFAULT_CASING, {
      file_names: "Camel",
      types: "Pascal",
      fields: "Pascal",
      directories: "Camel",
    });
    const casing = createCasing({});
    assert.equal(casing.convertFileName(NAME), "notificationType");
    assert.equal(casing.convertTypes(NAME), "NotificationType");
    assert.equal(casing.convertFields(NAME), "NotificationType");
    assert.equal(casing.convertDirectories(NAME), "notificationType");
    assert.equal(casing.filePath(NAME), "notificationType.cs");
    assert.equal(casing.serviceClassName("user"), "UserService");
  });
});

describe("createCasing overrides", () => {
  it("pascals file names", () => {
    const casing = createCasing({
      "languages.csharp.casing.file_names": "Pascal",
    });
    assert.equal(casing.filePath(NAME), "NotificationType.cs");
  });

  it("snakes file names", () => {
    const casing = createCasing({
      "languages.csharp.casing.file_names": "Snake",
    });
    assert.equal(casing.filePath(NAME), "notification_type.cs");
  });

  it("camels fields", () => {
    const casing = createCasing({
      "languages.csharp.casing.fields": "Camel",
    });
    assert.equal(casing.convertFields("role_id"), "roleId");
  });

  it("snakes fields", () => {
    const casing = createCasing({
      "languages.csharp.casing.fields": "Snake",
    });
    assert.equal(casing.convertFields("RoleId"), "role_id");
  });

  it("kebabs directories", () => {
    const casing = createCasing({
      "languages.csharp.casing.directories": "Kebab",
    });
    assert.equal(casing.directory(NAME), "notification-type");
  });
});
