import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createImportGenerator } from "./import-generator.ts";

const layered = () => createImportGenerator(".", {});
const byFeature = (extra: Record<string, string> = {}) =>
  createImportGenerator(".", {
    "other.organize_by_feature": "true",
    ...extra,
  });
const flat = (basePath: string, extra: Record<string, string> = {}) =>
  createImportGenerator(basePath, extra);

describe("CsharpImportGenerator layered (organize_by_feature unset)", () => {
  it("emits Camel Auto files and Pascal type quals", () => {
    const imports = layered();
    assert.equal(imports.datasource("user"), "user.cs");
    assert.equal(imports.datasourceRel("user"), "user.cs");
    assert.equal(
      imports.datasourceQual("user"),
      "Backend.Types.Datasource.User",
    );
    assert.equal(
      imports.datasourceValidator("user"),
      "datasourceUserValidator.cs",
    );
    assert.equal(
      imports.datasourceValidatorRel("user"),
      "datasourceUserValidator.cs",
    );
    assert.equal(imports.view("card_payment"), "cardPayment.cs");
    assert.equal(imports.viewRel("card_payment"), "cardPayment.cs");
    assert.equal(imports.viewQual("card_payment"), "Backend.Types.View.CardPayment");
    assert.equal(imports.viewValidator("user"), "userValidator.cs");
    assert.equal(imports.viewValidatorRel("user"), "userValidator.cs");
    assert.equal(imports.service("user"), "userService.cs");
    assert.equal(imports.serviceRel("user"), "userService.cs");
    assert.equal(imports.serviceCustom("ReportService"), "../custom/reportService.cs");
    assert.equal(
      imports.serviceCustom("health-check-service"),
      "../custom/healthCheckService.cs",
    );
    assert.equal(
      imports.serviceCustomRel("user"),
      "../custom/user.cs",
    );
    assert.equal(imports.serviceTest("user"), "userServiceTests.cs");
    assert.equal(imports.serviceTestRel("user"), "userServiceTests.cs");
    assert.equal(imports.serviceIntegrationTest("user"), "userServiceTests.cs");
    assert.equal(
      imports.serviceIntegrationTestRel("user"),
      "userServiceTests.cs",
    );
    assert.equal(imports.serviceUse("user", "UserService"), "");
    assert.equal(imports.route("user"), "usersRouter.cs");
    assert.equal(imports.route("card_payment"), "cardPaymentsRouter.cs");
    assert.equal(imports.routeRel("user"), "usersRouter.cs");
    assert.equal(imports.routeModule("user"), "usersRouter");
    assert.equal(
      imports.routeCustom("get_health"),
      "../custom/getHealthRoute.cs",
    );
    assert.equal(imports.routeTest("user"), "usersRouterTests.cs");
    assert.equal(imports.enrichment("role"), "roleNameEnrichment.cs");
    assert.equal(imports.test("User.cs", "user"), "userTests.cs");
    assert.equal(
      imports.test("UserValidator.cs", "user"),
      "userValidatorTests.cs",
    );
    assert.equal(
      imports.test("DatasourceUserValidator.cs", "user"),
      "userValidatorTests.cs",
    );
    assert.equal(imports.testSpec("User.cs", "user"), "");
    assert.equal(imports.index("User.cs"), "");
    assert.equal(imports.spec("UserService.cs", "User.cs"), "Backend.Types.Datasource");
    assert.equal(imports.appWiring(), "");
    assert.equal(imports.validatorFn("datasource", "user", "x"), "");
    assert.equal(imports.validatorFn("view", "user", "x"), "");
    assert.equal(imports.apiPath("card_payment"), "card-payment");
    assert.equal(imports.frontend("src/App.cs"), "frontend/src/App.cs");
  });

  it("cases file names from settings for every lane", () => {
    assert.equal(layered().datasource("notification_type"), "notificationType.cs");
    assert.equal(layered().view("notification_type"), "notificationType.cs");
    assert.equal(
      layered().service("notification_type"),
      "notificationTypeService.cs",
    );
    const pascal = createImportGenerator(".", {
      "languages.csharp.casing.file_names": "Pascal",
    });
    assert.equal(pascal.datasource("notification_type"), "NotificationType.cs");
    assert.equal(pascal.view("notification_type"), "NotificationType.cs");
    assert.equal(pascal.service("notification_type"), "NotificationTypeService.cs");
    const snake = createImportGenerator(".", {
      "languages.csharp.casing.file_names": "Snake",
    });
    assert.equal(snake.datasource("notification_type"), "notification_type.cs");
  });

  it("cases type quals from settings independently of files", () => {
    const snakeTypes = createImportGenerator(".", {
      "languages.csharp.casing.types": "Snake",
    });
    assert.equal(snakeTypes.view("user"), "user.cs");
    assert.equal(
      snakeTypes.datasourceQual("notification_type"),
      "Backend.Types.Datasource.notification_type",
    );
    assert.equal(snakeTypes.viewQual("user"), "Backend.Types.View.user");
  });

  it("treats organize_by_feature values other than true as layered", () => {
    for (const value of ["", "false", "TRUE", "1"]) {
      const imports = createImportGenerator(".", {
        "other.organize_by_feature": value,
      });
      assert.equal(imports.datasource("user"), "user.cs", value);
      assert.equal(imports.serviceCustom("ReportService"), "../custom/reportService.cs", value);
    }
  });
});

describe("CsharpImportGenerator by-feature", () => {
  it("nests datasource files under Features/ and leaves view files layered", () => {
    const imports = byFeature({
      "languages.csharp.casing.file_names": "Pascal",
      "languages.csharp.casing.directories": "Kebab",
    });
    assert.equal(
      imports.datasource("notification_type"),
      "Features/notification-type/NotificationType.cs",
    );
    assert.equal(
      imports.datasourceRel("notification_type"),
      "Features/notification-type/NotificationType.cs",
    );
    assert.equal(imports.view("user"), "User.cs");
    assert.equal(imports.viewRel("user"), "User.cs");
    assert.equal(imports.service("user"), "UserService.cs");
  });

  it("uses Camel Auto datasource files under a Camel feature directory", () => {
    const imports = byFeature();
    assert.equal(
      imports.datasource("notification_type"),
      "Features/notificationType/notificationType.cs",
    );
    assert.equal(imports.datasource("user"), "Features/user/user.cs");
    assert.equal(imports.frontend("Pages/Index.cshtml"), "frontend/Pages/Index.cshtml");
  });

  it("places custom stubs under Features/<dir>/custom/", () => {
    const imports = byFeature({
      "languages.csharp.casing.directories": "Kebab",
    });
    assert.equal(
      imports.serviceCustom("user"),
      "Features/user/custom/user.cs",
    );
    assert.equal(
      imports.serviceCustom("create_card_payment"),
      "Features/card-payment/custom/createCardPayment.cs",
    );
    assert.equal(
      imports.serviceCustom("update_card_payment"),
      "Features/card-payment/custom/updateCardPayment.cs",
    );
    assert.equal(
      imports.serviceCustomRel("notification_type"),
      "Features/notification-type/custom/notificationType.cs",
    );
    assert.equal(
      imports.routeCustom("get_health"),
      "Features/get-health/custom/getHealthRoute.cs",
    );
    assert.equal(
      imports.routeCustom("create_card_payment"),
      "Features/card-payment/custom/createCardPaymentRoute.cs",
    );
    assert.equal(
      imports.serviceCustom("user", "./ignored/module"),
      "Features/user/custom/user.cs",
    );
  });

  it("uses Snake feature directories when casing.directories is Snake", () => {
    const imports = byFeature({
      "languages.csharp.casing.file_names": "Pascal",
      "languages.csharp.casing.directories": "Snake",
    });
    assert.equal(
      imports.datasource("notification_type"),
      "Features/notification_type/NotificationType.cs",
    );
    assert.equal(
      imports.serviceCustomRel("notification_type"),
      "Features/notification_type/custom/NotificationType.cs",
    );
  });
});

describe("CsharpImportGenerator flat basePath", () => {
  it("ignores organize_by_feature and prefixes the directory", () => {
    const imports = flat("Backend/Types", {
      "other.organize_by_feature": "true",
      "languages.csharp.casing.file_names": "Pascal",
    });
    assert.equal(imports.datasource("user"), "Backend/Types/User.cs");
    assert.equal(imports.view("user"), "Backend/Types/User.cs");
    assert.equal(imports.serviceCustom("ReportService"), "Backend/Types/../custom/ReportService.cs");
    assert.equal(imports.test("User.cs", "user"), "Backend/Types/UserTests.cs");
  });

  it("treats empty basePath as backend layout, not flat", () => {
    const imports = createImportGenerator("", {
      "other.organize_by_feature": "true",
      "languages.csharp.casing.file_names": "Pascal",
    });
    assert.equal(imports.datasource("user"), "Features/user/User.cs");
  });
});
