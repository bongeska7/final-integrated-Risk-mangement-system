using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QM.Models.DataModels
{
    public class User : IdentityUser<int>
    {

        [Range(100000, 999999, ErrorMessage = "ID must be a 6-digit number.")]
        [Column("EmployeeId")]
        public override int Id { get; set; }
        public override string? UserName { get; set; }
        public string? RefreshToken { get; set; }
        public DateTime? RefreshTokenExpiryTime { get; set; }
        [Range(100000, 999999, ErrorMessage = "Manager ID must be a 6-digit number.")]
        public int? ManagerId { get; set; } 
        
        public ICollection<Risk>? risk { get; set; }
        public ICollection<Request>? request { get; set; }
        public ICollection<NotificationModel>? notifications { get; set; }

    }
}
