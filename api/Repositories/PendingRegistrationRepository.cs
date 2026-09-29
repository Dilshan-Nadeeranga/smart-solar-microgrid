using MongoDB.Driver;
using SolarGrid.Api.Data;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.Repositories;

public class PendingRegistrationRepository
{
    private readonly IMongoCollection<PendingRegistration> _collection;

    public PendingRegistrationRepository(MongoDbContext dbContext)
    {
        _collection = dbContext.Database.GetCollection<PendingRegistration>("PendingRegistrations");
    }

    public async Task CreateAsync(PendingRegistration registration)
    {
        await _collection.InsertOneAsync(registration);
    }

    public async Task<PendingRegistration?> GetByRegistrationIdAsync(string registrationId)
    {
        return await _collection.Find(r => r.RegistrationId == registrationId).FirstOrDefaultAsync();
    }

    public async Task<PendingRegistration?> GetByNicOrEmailAsync(string nic, string email)
    {
        return await _collection.Find(r => r.NIC == nic || r.Email == email).FirstOrDefaultAsync();
    }

    public async Task UpdateAsync(PendingRegistration registration)
    {
        await _collection.ReplaceOneAsync(r => r.Id == registration.Id, registration);
    }

    public async Task DeleteAsync(string id)
    {
        await _collection.DeleteOneAsync(r => r.Id == id);
    }
}
