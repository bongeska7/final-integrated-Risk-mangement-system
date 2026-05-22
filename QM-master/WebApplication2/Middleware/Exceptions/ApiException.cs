namespace QM.Middleware.Exceptions
{
    /// <summary>
    /// Base exception for domain / business-rule errors that should be returned
    /// to the client with a specific HTTP status code. Throwing one of these
    /// subclasses from a controller or service lets the global exception
    /// middleware translate it automatically into the correct response.
    /// </summary>
    public class ApiException : Exception
    {
        /// <summary>HTTP status code to return (e.g. 400, 404, 409).</summary>
        public int StatusCode { get; }

        public ApiException(string message, int statusCode = 500)
            : base(message)
        {
            StatusCode = statusCode;
        }
    }

    /// <summary>Thrown when a requested resource does not exist (404).</summary>
    public class NotFoundException : ApiException
    {
        public NotFoundException(string message = "The requested resource was not found.")
            : base(message, 404) { }
    }

    /// <summary>Thrown when input validation fails (400).</summary>
    public class BadRequestException : ApiException
    {
        public BadRequestException(string message = "The request is invalid.")
            : base(message, 400) { }
    }

    /// <summary>Thrown when the user is not authenticated (401).</summary>
    public class UnauthorizedException : ApiException
    {
        public UnauthorizedException(string message = "Authentication is required.")
            : base(message, 401) { }
    }

    /// <summary>Thrown when the user lacks permission (403).</summary>
    public class ForbiddenException : ApiException
    {
        public ForbiddenException(string message = "You do not have permission to perform this action.")
            : base(message, 403) { }
    }

    /// <summary>Thrown on resource conflicts such as duplicate entries (409).</summary>
    public class ConflictException : ApiException
    {
        public ConflictException(string message = "A conflict occurred with the current state of the resource.")
            : base(message, 409) { }
    }
}
