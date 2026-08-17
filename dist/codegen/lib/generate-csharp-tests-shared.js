/** Assemble a csharp xUnit test file from a prebuilt `header` and the `facts` (each an already-rendered `[Fact]` method). Shared by the view-tests and datasource-tests csharp generators, which differ only in how they build `header` + `facts`. */
export function generateCsharpTestClass(testClass, header, facts) {
    const body = [`public class ${testClass}`, `{`, facts.join("\n\n"), `}`].join("\n");
    return { path: `${testClass}.cs`, content: `${header}${body}\n` };
}
