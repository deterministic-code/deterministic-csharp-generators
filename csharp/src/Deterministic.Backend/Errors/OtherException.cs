namespace Deterministic.Backend.Errors;

public sealed class OtherException : RepositoryException
{
    public OtherException(string message) : base(message) { }

    public OtherException() : base("other repository error") { }

    public OtherException(string message, Exception innerException)
        : base(message, innerException) { }
}
