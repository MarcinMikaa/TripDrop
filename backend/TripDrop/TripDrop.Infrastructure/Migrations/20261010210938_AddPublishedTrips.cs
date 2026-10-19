using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace TripDrop.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPublishedTrips : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SourcePublishedTripId",
                table: "Trips",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PublishedTrips",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SourceTripId = table.Column<Guid>(type: "uuid", nullable: true),
                    AuthorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Region = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    SearchText = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Tags = table.Column<List<string>>(type: "text[]", nullable: false),
                    Visibility = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DayCount = table.Column<int>(type: "integer", nullable: false),
                    PointCount = table.Column<int>(type: "integer", nullable: false),
                    TotalDistanceM = table.Column<int>(type: "integer", nullable: true),
                    TotalDurationS = table.Column<int>(type: "integer", nullable: true),
                    TravelMode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Center = table.Column<Point>(type: "geography (Point, 4326)", nullable: false),
                    Content = table.Column<string>(type: "jsonb", nullable: false),
                    CopyCount = table.Column<int>(type: "integer", nullable: false),
                    PublishedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PublishedTrips", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PublishedTrips_Trips_SourceTripId",
                        column: x => x.SourceTripId,
                        principalTable: "Trips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PublishedTrips_Users_AuthorId",
                        column: x => x.AuthorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Trips_SourcePublishedTripId",
                table: "Trips",
                column: "SourcePublishedTripId");

            migrationBuilder.CreateIndex(
                name: "IX_PublishedTrips_AuthorId",
                table: "PublishedTrips",
                column: "AuthorId");

            migrationBuilder.CreateIndex(
                name: "IX_PublishedTrips_Center",
                table: "PublishedTrips",
                column: "Center")
                .Annotation("Npgsql:IndexMethod", "GIST");

            migrationBuilder.CreateIndex(
                name: "IX_PublishedTrips_SourceTripId",
                table: "PublishedTrips",
                column: "SourceTripId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PublishedTrips_Status_Visibility_PublishedAt",
                table: "PublishedTrips",
                columns: new[] { "Status", "Visibility", "PublishedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PublishedTrips_Tags",
                table: "PublishedTrips",
                column: "Tags")
                .Annotation("Npgsql:IndexMethod", "GIN");

            migrationBuilder.AddForeignKey(
                name: "FK_Trips_PublishedTrips_SourcePublishedTripId",
                table: "Trips",
                column: "SourcePublishedTripId",
                principalTable: "PublishedTrips",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.Sql("ALTER TABLE \"PublishedTrips\" ENABLE ROW LEVEL SECURITY;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Trips_PublishedTrips_SourcePublishedTripId",
                table: "Trips");

            migrationBuilder.DropTable(
                name: "PublishedTrips");

            migrationBuilder.DropIndex(
                name: "IX_Trips_SourcePublishedTripId",
                table: "Trips");

            migrationBuilder.DropColumn(
                name: "SourcePublishedTripId",
                table: "Trips");
        }
    }
}
