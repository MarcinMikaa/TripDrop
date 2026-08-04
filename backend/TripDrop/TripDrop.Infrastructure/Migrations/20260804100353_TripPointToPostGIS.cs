using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace TripDrop.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class TripPointToPostGIS : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "TripPoints");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "TripPoints");

            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:postgis", ",,");

            migrationBuilder.AddColumn<Point>(
                name: "Location",
                table: "TripPoints",
                type: "geography (Point, 4326)",
                nullable: false);

            migrationBuilder.CreateIndex(
                name: "IX_TripPoints_Location",
                table: "TripPoints",
                column: "Location")
                .Annotation("Npgsql:IndexMethod", "GIST");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TripPoints_Location",
                table: "TripPoints");

            migrationBuilder.DropColumn(
                name: "Location",
                table: "TripPoints");

            migrationBuilder.AlterDatabase()
                .OldAnnotation("Npgsql:PostgresExtension:postgis", ",,");

            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                table: "TripPoints",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "Longitude",
                table: "TripPoints",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);
        }
    }
}
