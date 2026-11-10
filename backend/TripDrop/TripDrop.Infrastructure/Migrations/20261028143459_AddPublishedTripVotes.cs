using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripDrop.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPublishedTripVotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "VoteCount",
                table: "PublishedTrips",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "PublishedTripVotes",
                columns: table => new
                {
                    PublishedTripId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PublishedTripVotes", x => new { x.PublishedTripId, x.UserId });
                    table.ForeignKey(
                        name: "FK_PublishedTripVotes_PublishedTrips_PublishedTripId",
                        column: x => x.PublishedTripId,
                        principalTable: "PublishedTrips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PublishedTripVotes_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PublishedTrips_VoteCount",
                table: "PublishedTrips",
                column: "VoteCount");

            migrationBuilder.CreateIndex(
                name: "IX_PublishedTripVotes_UserId",
                table: "PublishedTripVotes",
                column: "UserId");

            migrationBuilder.Sql("ALTER TABLE \"PublishedTripVotes\" ENABLE ROW LEVEL SECURITY;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PublishedTripVotes");

            migrationBuilder.DropIndex(
                name: "IX_PublishedTrips_VoteCount",
                table: "PublishedTrips");

            migrationBuilder.DropColumn(
                name: "VoteCount",
                table: "PublishedTrips");
        }
    }
}
