namespace Deterministic.Backend.Errors;

public sealed class UnimplementedException : RepositoryException
{
    public UnimplementedException(string message)
        : base($"unimplemented: {message}")
    {
        Detail = message;
    }

    public UnimplementedException() : base("unimplemented") { }

    public UnimplementedException(string message, Exception innerException)
        : base(message, innerException) { }

    public string Detail { get; } = string.Empty;
}
