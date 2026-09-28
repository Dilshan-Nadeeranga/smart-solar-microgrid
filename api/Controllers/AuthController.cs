using Microsoft.AspNetCore.Mvc;
using SolarGrid.Api.Models;
using SolarGrid.Api.Services;

namespace SolarGrid.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserService _userService;

    public AuthController(UserService userService)
    {
        _userService = userService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.NIC) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new
            {
                message = "NIC or email and password are required."
            });
        }

        var result = await _userService.LoginAsync(
            request.NIC,
            request.Password
        );

        if (!result.Success)
        {
            return Unauthorized(new
            {
                message = result.Message
            });
        }

        return Ok(result.Response);
    }



[HttpPost("register")]
public async Task<IActionResult> RegisterProsumer(
    [FromBody] RegisterProsumerRequest request)
{
    // Validate the required registration information.
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

    // Create a Prosumer account from the registration request.
    var user = new User
    {
        NIC = request.NIC,
        Name = request.Name,
        Email = request.Email,
        Phone = request.Phone,
        Address = request.Address,
        Role = Role.PROSUMER,
        AccountStatus = AccountStatus.PENDING
    };

    var result = await _userService.RegisterProsumerAsync(
        user,
        request.Password
    );

    // Return conflict when the NIC is already registered.
    if (!result.Success)
    {
        return Conflict(new
        {
            message = result.Message
        });
    }

    return CreatedAtAction(
        nameof(Login),
        null,
        result.User
    );
}
    
}