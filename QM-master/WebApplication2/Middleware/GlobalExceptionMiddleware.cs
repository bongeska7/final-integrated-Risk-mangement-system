using QM.Middleware.Exceptions;
using System.Net;
using System.Text.Json;

namespace QM.Middleware
{
    /// <summary>
    /// ASP.NET Core middleware that catches ALL unhandled exceptions and converts
    /// them into a uniform <see cref="ApiErrorResponse"/> JSON payload.
    ///
    /// • <see cref="ApiException"/> subclasses → mapped to their declared status code.
    /// • Any other exception → 500 Internal Server Error (details hidden from clients).
    ///
    /// Every caught exception is logged with full stack trace and a correlation
    /// TraceId so it can be matched against the response the client receives.
    /// </summary>
    public class GlobalExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionMiddleware> _logger;
        private readonly IHostEnvironment _env;

        public GlobalExceptionMiddleware(
            RequestDelegate next,
            ILogger<GlobalExceptionMiddleware> logger,
            IHostEnvironment env)
        {
            _next = next;
            _logger = logger;
            _env = env;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                await HandleExceptionAsync(context, ex);
            }
        }

        private async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            var traceId = context.TraceIdentifier;

            // ── Determine status code & message ──────────────────────────
            int statusCode;
            string message;

            if (exception is ApiException apiEx)
            {
                // Known business/domain error — use the declared status & message.
                statusCode = apiEx.StatusCode;
                message = apiEx.Message;

                _logger.LogWarning(
                    exception,
                    "API exception [{StatusCode}] TraceId={TraceId}: {Message}",
                    statusCode, traceId, message);
            }
            else
            {
                // Unexpected error — always 500, never leak internal details.
                statusCode = (int)HttpStatusCode.InternalServerError;
                message = _env.IsDevelopment()
                    ? exception.Message       // Show real message during development
                    : "An unexpected error occurred. Please try again later.";

                _logger.LogError(
                    exception,
                    "Unhandled exception TraceId={TraceId}: {Message}",
                    traceId, exception.Message);
            }

            // ── Build the response envelope ──────────────────────────────
            var response = new ApiErrorResponse
            {
                StatusCode = statusCode,
                Message = message,
                TraceId = traceId
            };

            context.Response.ContentType = "application/json";
            context.Response.StatusCode = statusCode;

            var options = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };

            await context.Response.WriteAsync(
                JsonSerializer.Serialize(response, options));
        }
    }
}
