using MongoDB.Driver;

namespace SolarGrid.Api.Data;

public class MongoDbContext
{
    private readonly IMongoClient _client;
    private readonly IMongoDatabase _database;

    public MongoDbContext(MongoDbSettings settings)
    {
        _client = new MongoClient(settings.ConnectionString);
        _database = _client.GetDatabase(settings.DatabaseName);
    }

    public IMongoClient Client => _client;

    public IMongoDatabase Database => _database;
}
