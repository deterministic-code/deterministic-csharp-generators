using Deterministic.Backend.Errors;

namespace Deterministic.Backend.Repositories.InMemory;

public class InMemoryCrudRepository : ICrudRepository
{
    private readonly List<RowMap> rows = new();
    private long nextId = 1;

    public Task<IReadOnlyList<RowMap>> QueryAsync(
        string sql,
        IReadOnlyList<object?>? parameters = null,
        CancellationToken cancellationToken = default)
    {
        throw new UnimplementedException("InMemory backend does not support raw SQL queries");
    }

    public Task<RowMap?> FindAsync(long id, CancellationToken cancellationToken = default)
    {
        var match = rows.FirstOrDefault(r => RowId(r) == id);
        return Task.FromResult<RowMap?>(match is null ? null : Copy(match));
    }

    public Task<IReadOnlyList<RowMap>> FindAllAsync(CancellationToken cancellationToken = default)
    {
        IReadOnlyList<RowMap> all = rows
            .OrderBy(RowId)
            .Select(Copy)
            .ToList();
        return Task.FromResult(all);
    }

    public Task<IReadOnlyList<RowMap>> FindByAsync(
        string column,
        object? value,
        CancellationToken cancellationToken = default)
    {
        IReadOnlyList<RowMap> matches = rows
            .Where(r => r.TryGetValue(column, out var v) && Equals(v, value))
            .OrderBy(RowId)
            .Select(Copy)
            .ToList();
        return Task.FromResult(matches);
    }

    public virtual Task<RowMap> AddAsync(
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(data);
        var row = new RowMap();
        foreach (var kvp in data)
        {
            row[kvp.Key] = kvp.Value;
        }
        row["id"] = nextId++;
        rows.Add(row);
        return Task.FromResult(Copy(row));
    }

    public virtual Task<RowMap?> UpdateAsync(
        long id,
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(data);
        var idx = rows.FindIndex(r => RowId(r) == id);
        if (idx == -1)
        {
            return Task.FromResult<RowMap?>(null);
        }
        var merged = new RowMap();
        foreach (var kvp in rows[idx])
        {
            merged[kvp.Key] = kvp.Value;
        }
        foreach (var kvp in data)
        {
            merged[kvp.Key] = kvp.Value;
        }
        merged["id"] = id;
        rows[idx] = merged;
        return Task.FromResult<RowMap?>(Copy(merged));
    }

    public Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var idx = rows.FindIndex(r => RowId(r) == id);
        if (idx == -1)
        {
            return Task.FromResult(false);
        }
        rows.RemoveAt(idx);
        return Task.FromResult(true);
    }

    private static long RowId(RowMap row)
    {
        if (!row.TryGetValue("id", out var value) || value is null)
        {
            return 0;
        }
        return Convert.ToInt64(value, CultureInfo.InvariantCulture);
    }

    private static RowMap Copy(RowMap row)
    {
        var copy = new RowMap(row.Count);
        foreach (var kvp in row)
        {
            copy[kvp.Key] = kvp.Value;
        }
        return copy;
    }
}
