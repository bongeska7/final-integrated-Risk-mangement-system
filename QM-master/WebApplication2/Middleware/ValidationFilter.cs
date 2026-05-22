using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace QM.Middleware
{
    /// <summary>
    /// Action filter that intercepts requests with invalid ModelState BEFORE the
    /// controller action executes. Returns a consistent <see cref="ApiErrorResponse"/>
    /// with field-level validation errors so that the frontend receives the same
    /// error shape regardless of whether it's a model validation failure or an
    /// unhandled exception.
    /// </summary>
    public class ValidationFilter : IActionFilter
    {
        public void OnActionExecuting(ActionExecutingContext context)
        {
            if (!context.ModelState.IsValid)
            {
                var errors = context.ModelState
                    .Where(ms => ms.Value?.Errors.Count > 0)
                    .ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value!.Errors.Select(e => e.ErrorMessage).ToArray()
                    );

                var response = new ApiErrorResponse
                {
                    StatusCode = 400,
                    Message = "One or more validation errors occurred.",
                    Errors = errors,
                    TraceId = context.HttpContext.TraceIdentifier
                };

                context.Result = new BadRequestObjectResult(response);
            }
        }

        public void OnActionExecuted(ActionExecutedContext context) { }
    }
}
