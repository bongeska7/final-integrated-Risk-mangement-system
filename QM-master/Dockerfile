# Stage 1: Build the ASP.NET Core application
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy the project files. We copy the .csproj files first and restore to cache the layer
COPY ["WebApplication2/QM.csproj", "WebApplication2/"]
COPY ["QM.Models/QM.Models.csproj", "QM.Models/"]
COPY ["QM.DataAccess/QM.DataAccess.csproj", "QM.DataAccess/"]

# Restore dependencies
RUN dotnet restore "WebApplication2/QM.csproj"

# Copy the rest of the source code
COPY . .

# Build the application
WORKDIR "/src/WebApplication2"
RUN dotnet build "QM.csproj" -c Release -o /app/build

# Stage 2: Publish the application
FROM build AS publish
RUN dotnet publish "QM.csproj" -c Release -o /app/publish

# Stage 3: Run the application
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
EXPOSE 8080

COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "QM.dll"]
