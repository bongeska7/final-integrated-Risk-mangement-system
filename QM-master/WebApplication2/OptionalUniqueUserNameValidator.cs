using Microsoft.AspNetCore.Identity;
using QM.Models.DataModels;

/// <summary>
/// Custom user validator that allows duplicate usernames.
/// Replaces the default UserValidator which enforces unique UserName.
/// </summary>
public class OptionalUniqueUserNameValidator : IUserValidator<User>
{
    public Task<IdentityResult> ValidateAsync(UserManager<User> manager, User user)
    {
        var errors = new List<IdentityError>();

        // Validate username is not empty
        if (string.IsNullOrWhiteSpace(user.UserName))
        {
            errors.Add(new IdentityError
            {
                Code = "InvalidUserName",
                Description = "Username cannot be empty."
            });
        }

        // Skip the duplicate username check — allow duplicate usernames

        return Task.FromResult(errors.Count > 0
            ? IdentityResult.Failed(errors.ToArray())
            : IdentityResult.Success);
    }
}
