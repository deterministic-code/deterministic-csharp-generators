/** Assemble a csharp xUnit test file from a prebuilt `header` and the `facts` (each an already-rendered `[Fact]` method). Shared by the view-tests and datasource-tests csharp emitters, which differ only in how they build `header` + `facts`. */
export declare function emitCsharpTestClass(testClass: string, header: string, facts: string[]): {
    path: string;
    content: string;
};
