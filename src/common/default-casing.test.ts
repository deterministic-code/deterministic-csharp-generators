import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCasing } from "./default-casing.ts";

const NAME = "notification_type";

describe("createCasing Auto defaults", () => {
  it("matches Default Casings for C#", () => {
    const casing = createCasing({});
    assert.equal(casing.convertFileName(NAME), "notificationType");
    assert.equal(casing.convertTypes(NAME), "NotificationType");
    assert.equal(casing.convertFields(NAME), "NotificationType");
    assert.equal(casing.convertDirectories(NAME), "notificationType");
    assert.equal(casing.filePath(NAME), "notificationType.cs");
    assert.equal(casing.serviceClassName("user"), "UserService");
    assert.equal(casing.serviceInterfaceName("contact"), "IContactService");
    assert.equal(
      casing.authoredInterfaceName("ContactImportService"),
      "IContactImportService",
    );
    assert.equal(casing.interfaceName("usersRouter"), "IUsersRouter");
    assert.equal(casing.nameSourceInterfaceName("role"), "IRoleNameSource");
    assert.equal(casing.testClassName("user"), "UserTests");
    assert.equal(casing.getsTestName("nick_name"), "GetsNickName");
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

  it("snakes authored interface names from the i_ stem", () => {
    const casing = createCasing({
      "languages.csharp.casing.types": "Snake",
    });
    assert.equal(
      casing.authoredInterfaceName("ContactImportService"),
      "i_contact_import_service",
    );
  });

  it("kebabs directories", () => {
    const casing = createCasing({
      "languages.csharp.casing.directories": "Kebab",
    });
    assert.equal(casing.directory(NAME), "notification-type");
  });
});
