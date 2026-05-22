using System.Text.Json.Serialization;

namespace QM.Middleware
{
    /// <summary>
    /// Standardized API error envelope returned by all error-handling paths
    /// (exception middleware, validation filters, manual error responses).
    /// Every error response from the API will have this shape, making it easy
    /// for the React frontend to parse errors consistently.
    /// </summary>
    public class ApiErrorResponse
    {
        /// <summary>Always false for error responses.</summary>
        [JsonPropertyName("success")]
        public bool Success { get; init; } = false;

        /// <summary>HTTP status code (e.g. 400, 404, 500).</summary>
        [JsonPropertyName("statusCode")]
        public int StatusCode { get; init; }

        /// <summary>Human-readable error message safe to display to the user.</summary>
        [JsonPropertyName("message")]
        public string Message { get; init; } = string.Empty;

        /// <summary>
        /// Optional dictionary of field-level validation errors.
        /// Key = field name, Value = list of error messages.
        /// Only populated for 400 – Bad Request (validation) errors.
        /// </summary>
        [JsonPropertyName("errors")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public IDictionary<string, string[]>? Errors { get; init; }

        /// <summary>
        /// A unique trace identifier that ties the response back to the server log entry.
        /// Useful for support tickets and debugging.
        /// </summary>
        [JsonPropertyName("traceId")]
        public string? TraceId { get; init; }

        /// <summary>
        /// ISO-8601 timestamp of when the error occurred.
        /// </summary>
        [JsonPropertyName("timestamp")]
        public string Timestamp { get; init; } = DateTime.UtcNow.ToString("o");
    }
}
