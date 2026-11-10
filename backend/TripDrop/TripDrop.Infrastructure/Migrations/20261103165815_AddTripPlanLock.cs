using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripDrop.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTripPlanLock : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "PlanLockedAt",
                table: "Trips",
                type: "timestamp without time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PlanLockedAt",
                table: "Trips");
        }
    }
}
