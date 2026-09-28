using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolarGrid.Api.Models;
using SolarGrid.Api.Services;

namespace SolarGrid.Api.Controllers;

[ApiController]
[Route("api/users")]
public class UserController : ControllerBase
{
    private readonly UserService _userService;

    public UserController(UserService userService)
    {
        _userService = userService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.NIC) ||
            string.IsNullOrWhiteSpace(request.Name) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new
            {
                message = "NIC, name, email and password are required."
            });
        }

        var user = new User
        {
            NIC = request.NIC,
            Name = request.Name,
            Email = request.Email,
            Phone = request.Phone,
            Address = request.Address,
            Role = request.Role,
            AccountStatus = AccountStatus.ACTIVE
        };

        var result = await _userService.CreateUserAsync(
            user,
            request.Password
        );

        if (!result.Success)
        {
            return Conflict(new
            {
                message = result.Message
            });
        }

        return CreatedAtAction(
            nameof(GetUser),
            new { nic = user.NIC },
            result.User
        );
    }

    [AllowAnonymous]
    [HttpGet("prosumers")]
    public async Task<IActionResult> ListProsumers()
    {
        var users = await _userService.GetAllAsync();

        var prosumers = users
            .Where(user => user.Role == Role.PROSUMER)
            .Select(user => new
            {
                nic = user.NIC,
                name = user.Name,
                address = user.Address,
                accountStatus = user.AccountStatus.ToString()
            });

        return Ok(prosumers);
    }

    [AllowAnonymous]
    [HttpGet("{nic}/booking")]
    public async Task<IActionResult> GetBookingProfile(string nic)
    {
        if (string.IsNullOrWhiteSpace(nic))
        {
            return BadRequest(new { message = "NIC is required." });
        }

        var user = await _userService.GetByNICAsync(nic.Trim());

        if (user is null)
        {
            return NotFound(new { message = "Prosumer account not found." });
        }

        if (user.Role != Role.PROSUMER)
        {
            return BadRequest(new
            {
                message = "Reservations can only be created for prosumer accounts."
            });
        }

        return Ok(new
        {
            nic = user.NIC,
            name = user.Name,
            address = user.Address,
            accountStatus = user.AccountStatus.ToString()
        });
    }

    [Authorize]
    [HttpGet("{nic}")]
    public async Task<IActionResult> GetUser(string nic)
    {
        var user = await _userService.GetByNICAsync(nic);

        if (user == null)
        {
            return NotFound(new
            {
                message = "User not found."
            });
        }

        user.PasswordHash = string.Empty;

        return Ok(user);
    }

    [Authorize(Roles = "BACKOFFICE")]
[HttpGet("backoffice-test")]
public IActionResult BackofficeTest()
{
    return Ok(new
    {
        message = "You have Backoffice access."
    });
}
}