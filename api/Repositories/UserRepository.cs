using System.Text.RegularExpressions;
using MongoDB.Bson;
using MongoDB.Driver;
using SolarGrid.Api.Data;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.Repositories;

public class UserRepository
{
    private readonly IMongoCollection<User> _users;

    public UserRepository(MongoDbContext mongoDbContext)
    {
        _users = mongoDbContext.Database.GetCollection<User>("Users");
    }

    public async Task<User?> GetByNICAsync(string nic)
    {
        return await _users
            .Find(user => user.NIC == nic)
            .FirstOrDefaultAsync();
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        var pattern = new BsonRegularExpression($"^{Regex.Escape(email.Trim())}$", "i");
        return await _users
            .Find(Builders<User>.Filter.Regex(user => user.Email, pattern))
            .FirstOrDefaultAsync();
    }

    public async Task<List<User>> GetAllAsync()
    {
        return await _users
            .Find(_ => true)
            .ToListAsync();
    }

    public async Task<List<User>> GetPendingUsersAsync()
{
    // Find all users whose accounts are waiting for activation.
    return await _users
        .Find(user => user.AccountStatus == AccountStatus.PENDING)
        .ToListAsync();
}

    public async Task CreateAsync(User user)
    {
        await _users.InsertOneAsync(user);
    }

    public async Task UpdateAsync(User user)
    {
        await _users.ReplaceOneAsync(
            existingUser => existingUser.NIC == user.NIC,
            user
        );
    }

    public async Task DeleteAsync(string nic)
    {
        await _users.DeleteOneAsync(user => user.NIC == nic);
    }


    public async Task<User?> GetByRoleAsync(Role role)
{
    return await _users
        .Find(user => user.Role == role)
        .FirstOrDefaultAsync();
}
}