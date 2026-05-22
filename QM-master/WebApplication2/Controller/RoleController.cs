using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QM.DataAccess.Repo.IRepo;
using QM.Models.DTO;

namespace QM.Controller
{
    [Route("api/role")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class RoleController : BaseController
    {
        private readonly RoleManager<IdentityRole<int>> _roleManager;

        public RoleController(RoleManager<IdentityRole<int>> roleManager, IUnitOfWork uow) : base(uow)
        {
            _roleManager = roleManager;
        }

        /// <summary>
        /// Get all roles in the system.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllRoles()
        {
            var roles = await _roleManager.Roles
                .Select(r => new { r.Id, r.Name })
                .ToListAsync();

            return Ok(roles);
        }

        /// <summary>
        /// Create a new role. Only accessible by Admin.
        /// </summary>
        [HttpPost("create")]
        public async Task<IActionResult> CreateRole([FromBody] CreateRoleDto model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Check if the role already exists
            if (await _roleManager.RoleExistsAsync(model.RoleName))
            {
                return Conflict(new { Message = $"Role '{model.RoleName}' already exists." });
            }

            var result = await _roleManager.CreateAsync(new IdentityRole<int>(model.RoleName));

            if (result.Succeeded)
            {
                return Ok(new { Message = $"Role '{model.RoleName}' created successfully." });
            }

            return BadRequest(new { Message = "Failed to create role.", Errors = result.Errors });
        }

        /// <summary>
        /// Delete a role by name. Only accessible by Admin.
        /// </summary>
        [HttpDelete("{roleName}")]
        public async Task<IActionResult> DeleteRole(string roleName)
        {
            var role = await _roleManager.FindByNameAsync(roleName);

            if (role == null)
            {
                return NotFound(new { Message = $"Role '{roleName}' not found." });
            }

            var result = await _roleManager.DeleteAsync(role);

            if (result.Succeeded)
            {
                return Ok(new { Message = $"Role '{roleName}' deleted successfully." });
            }

            return BadRequest(new { Message = "Failed to delete role.", Errors = result.Errors });
        }
    }
}
