using System.Text.RegularExpressions;

namespace TripDrop.Application.Users
{
    public static class UserRules
    {
        public const int UsernameMinLength = 3;
        public const int UsernameMaxLength = 30;
        public const int EmailMaxLength = 256;
        public const int PasswordMinLength = 8;

        private static readonly Regex UsernamePattern = new("^[a-zA-Z0-9_]+$", RegexOptions.Compiled);
        private static readonly Regex EmailPattern = new(@"^[^\s@]+@[^\s@]+\.[^\s@]+$", RegexOptions.Compiled);

        public static string NormalizeUsername(string? username) => username?.Trim() ?? string.Empty;

        public static string NormalizeEmail(string? email) => email?.Trim().ToLowerInvariant() ?? string.Empty;

        public static string? ValidateUsername(string username)
        {
            if (username.Length == 0)
                return "Podaj nazwę użytkownika.";

            if (!UsernamePattern.IsMatch(username))
                return "Nazwa użytkownika może zawierać tylko litery bez polskich znaków, cyfry i podkreślnik.";

            if (username.Length < UsernameMinLength)
                return $"Nazwa użytkownika musi mieć co najmniej {UsernameMinLength} znaki.";

            if (username.Length > UsernameMaxLength)
                return $"Nazwa użytkownika może mieć najwyżej {UsernameMaxLength} znaków.";

            return null;
        }

        public static string? ValidateEmail(string email)
        {
            if (email.Length == 0)
                return "Podaj adres e-mail.";

            if (email.Length > EmailMaxLength || !EmailPattern.IsMatch(email))
                return "Podaj prawidłowy adres e-mail.";

            return null;
        }

        public static string? ValidatePassword(string? password)
        {
            if (string.IsNullOrEmpty(password))
                return "Podaj hasło.";

            if (password.Length < PasswordMinLength)
                return $"Hasło musi mieć co najmniej {PasswordMinLength} znaków.";

            if (!password.Any(c => c is >= 'A' and <= 'Z'))
                return "Hasło musi zawierać przynajmniej jedną wielką literę.";

            if (!password.Any(char.IsAsciiDigit))
                return "Hasło musi zawierać przynajmniej jedną cyfrę.";

            return null;
        }
    }
}
