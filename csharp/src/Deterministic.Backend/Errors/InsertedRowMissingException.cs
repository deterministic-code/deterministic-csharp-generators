namespace Deterministic.Backend.Errors;

public sealed class InsertedRowMissingException : RepositoryException
{
    public InsertedRowMissingException(long rowId)
        : base($"inserted row id={rowId} not found")
    {
        RowId = rowId;
    }

    public InsertedRowMissingException() : base("inserted row not found") { }

    public InsertedRowMissingException(string message, Exception innerException)
        : base(message, innerException) { }

    public long RowId { get; }
}
