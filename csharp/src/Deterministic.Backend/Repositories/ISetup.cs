namespace Deterministic.Backend.Repositories;

public interface ISetup
{
    Task RunAsync(CancellationToken cancellationToken = default);
}
