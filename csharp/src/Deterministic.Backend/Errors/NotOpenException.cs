namespace Deterministic.Backend.Errors;

public sealed class NotOpenException : RepositoryException
{
    public NotOpenException(string datasource)
        : base($"{datasource} is not open; call OpenAsync() first")
    {
        Datasource = datasource;
    }

    public NotOpenException() : base("datasource is not open; call OpenAsync() first")
    {
        Datasource = "datasource";
    }

    public NotOpenException(string message, Exception innerException)
        : base(message, innerException) { }

    public string Datasource { get; } = "datasource";
}
