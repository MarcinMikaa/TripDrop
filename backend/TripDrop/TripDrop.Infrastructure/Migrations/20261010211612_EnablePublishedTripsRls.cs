using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripDrop.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class EnablePublishedTripsRls : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"PublishedTrips\" ENABLE ROW LEVEL SECURITY;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
