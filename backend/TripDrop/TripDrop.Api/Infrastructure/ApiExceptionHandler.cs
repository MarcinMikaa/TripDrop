using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using TripDrop.Application.Common.Exceptions;

namespace TripDrop.Api.Infrastructure
{
    public sealed class ApiExceptionHandler : IExceptionHandler
    {
        private readonly IProblemDetailsService _problemDetailsService;
        private readonly ILogger<ApiExceptionHandler> _logger;

        public ApiExceptionHandler(IProblemDetailsService problemDetailsService, ILogger<ApiExceptionHandler> logger)
        {
            _problemDetailsService = problemDetailsService;
            _logger = logger;
        }

        public async ValueTask<bool> TryHandleAsync(
            HttpContext httpContext,
            Exception exception,
            CancellationToken cancellationToken)
        {
            var (status, title) = exception switch
            {
                RequestValidationException => (StatusCodes.Status400BadRequest, "Nieprawidłowe dane"),
                UnauthorizedAccessException => (StatusCodes.Status403Forbidden, "Brak uprawnień"),
                ForbiddenAccessException => (StatusCodes.Status403Forbidden, "Brak uprawnień"),
                NotFoundException => (StatusCodes.Status404NotFound, "Nie znaleziono"),
                ConflictException => (StatusCodes.Status409Conflict, "Konflikt stanu"),
                OperationCanceledException when httpContext.RequestAborted.IsCancellationRequested
                    => (499, "Żądanie przerwane"),
                _ => (StatusCodes.Status500InternalServerError, "Błąd serwera"),
            };

            if (status == 499)
            {
                return true;
            }

            if (status == StatusCodes.Status500InternalServerError)
            {
                _logger.LogError(exception, "Nieobsłużony wyjątek: {Method} {Path}",
                    httpContext.Request.Method, httpContext.Request.Path);
            }

            var message = status == StatusCodes.Status500InternalServerError
                ? "Coś poszło nie tak. Spróbuj ponownie za chwilę."
                : exception.Message;

            var problem = new ProblemDetails
            {
                Status = status,
                Title = title,
                Detail = message,
                Extensions =
                {
                    ["error"] = message,
                    ["message"] = message,
                },
            };

            httpContext.Response.StatusCode = status;

            var written = await _problemDetailsService.TryWriteAsync(new ProblemDetailsContext
            {
                HttpContext = httpContext,
                Exception = exception,
                ProblemDetails = problem,
            });

            if (!written)
            {
                await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);
            }

            return true;
        }
    }
}
