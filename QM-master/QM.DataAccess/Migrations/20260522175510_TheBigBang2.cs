using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QM.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class TheBigBang2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddCheckConstraint(
                name: "chk_ManagerId_6digits",
                table: "AspNetUsers",
                sql: "[ManagerId] >= 100000 AND [ManagerId] <= 999999");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "chk_ManagerId_6digits",
                table: "AspNetUsers");
        }
    }
}
