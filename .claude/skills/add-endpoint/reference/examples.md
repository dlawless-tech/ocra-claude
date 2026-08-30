# Worked examples

Two runs, one per shape. Both assume the entity or view model already exists.

## A. New endpoint on an existing controller

The common case. Nothing is created at the class level, so nothing changes in DI.

**Parameters gathered**

| Parameter | Value |
| --- | --- |
| API | `person-api` |
| Reference controller | `PersonNarrativeController` |
| Controller | existing, `PersonNarrativeController` |
| HTTP method | GET |
| Action name | `GetPersonNarrativeForNarrativeTypeId` |
| Route | `Person/{personId}/NarrativeType/{narrativeTypeId}` |
| Authorize roles | `Member Edit - Narratives, Member Read`, taken from the sibling read action |
| Encryption handler | `yes`, because `personId` arrives encrypted and the sibling read action carries it |
| Service | existing, `PersonNarrativeService` |
| Repository | existing, `PersonNarrativeRepository` |
| Data access | `ef` |
| Return type | `IList<PersonNarrative>` |

**Files touched, in order**

| File | Change |
| --- | --- |
| `src/libs/dotnet/swims-data-access/Repositories/IPersonNarrativeRepository.cs` | Add the signature |
| `src/libs/dotnet/swims-data-access/Repositories/PersonNarrativeRepository.cs` | Add the method |
| `src/apps/dotnet/person-api/person-api/Services/IPersonNarrativeService.cs` | Add the signature |
| `src/apps/dotnet/person-api/person-api/Services/PersonNarrativeService.cs` | Add the pass-through |
| `src/apps/dotnet/person-api/person-api/Controllers/PersonNarrativeController.cs` | Add the action |

No DI change. Every class already exists and is already registered.

**Repository**

The `.Filter(...)` call and the `Area` value are copied from `GetPersonNarrativeForPersonId` directly above it, because the new method reads the same entity.

```csharp
public async Task<List<PersonNarrative>> GetPersonNarrativeForNarrativeTypeId(long currentPersonId, long personId, int narrativeTypeId)
{
    try
    {
        return await DbContext.PersonNarrative
            .AsNoTracking()
            .Where(pn => pn.PersonId == personId && pn.NarrativeTypeId == narrativeTypeId)
            .Filter(_configuration, currentPersonId, SecuredByOrgUnit.Settings.Area.PersonNarrative)
            .ToListAsync();
    }
    catch (DbUpdateException ex)
    {
        HandleDatabaseException(ex, "GetPersonNarrativeForNarrativeTypeId", $"PersonId = {personId}, NarrativeTypeId = {narrativeTypeId}");
    }
    catch (Exception ex)
    {
        HandleException(ex, "GetPersonNarrativeForNarrativeTypeId", $"PersonId = {personId}, NarrativeTypeId = {narrativeTypeId}");
    }
    return null;
}
```

**Service**

```csharp
public async Task<List<PersonNarrative>> GetPersonNarrativeForNarrativeTypeId(long currentPersonId, long personId, int narrativeTypeId)
{
    return await _repository.GetPersonNarrativeForNarrativeTypeId(currentPersonId, personId, narrativeTypeId);
}
```

**Controller**

Placed next to the other GET actions, above the writes, matching the file's existing order.

`personId` is `string` because it arrives encrypted and `[UsasEncryptionHandler]` decrypts it into a string. `narrativeTypeId` stays `int`: its name matches the filter, but a plain integer is not Base64, so the decrypt branch never fires.

```csharp
// GET: swims/PersonNarrative/Person/1/NarrativeType/2
[UsasEncryptionHandler]
[HttpGet("Person/{personId}/NarrativeType/{narrativeTypeId}")]
[Authorize(Roles = "Member Edit - Narratives, Member Read")]
public async Task<ActionResult<IList<PersonNarrative>>> GetPersonNarrativeForNarrativeTypeId(string personId, int narrativeTypeId)
{
    try
    {
        long pId = long.Parse(personId);
        if (pId == 0)
        {
            pId = base.GetCurrentPersonID();
        }
        if (!await _personService.PersonExistsForId(base.GetCurrentPersonID(), pId))
        {
            return NotFound();
        }
        return await _service.GetPersonNarrativeForNarrativeTypeId(base.GetCurrentPersonID(), pId, narrativeTypeId);
    }
    catch
    {
        return StatusCode(500);
    }
}
```

**Verify**

```
nx affected -t build --files=src/libs/dotnet/swims-data-access/Repositories/PersonNarrativeRepository.cs,src/apps/dotnet/person-api/person-api/Controllers/PersonNarrativeController.cs
```

Roughly twelve projects rebuild, because the repository is shared.

## B. New endpoint on a new controller

Three new classes plus two new interfaces, so DI changes in two projects.

**Parameters gathered**

| Parameter | Value |
| --- | --- |
| API | `times-api` |
| Reference controller | none given, so `TimeStandardController` was picked and named in the reply |
| Controller | new, `TimeLeaderboardController` |
| HTTP method | GET |
| Action name | `GetTimeLeaderboard` |
| Route | `Event/{eventId}` |
| Authorize roles | asked for, because the controller is new and no reference was given |
| Encryption handler | `no`. `eventId` is a plain identifier, not an encrypted one, and the response carries no secure fields |
| Service | new, `TimeLeaderboardService` |
| Repository | new, `TimeLeaderboardRepository` |
| Data access | `dapper`, against `app.GetTimeLeaderboard` |
| Return type | `IList<TimeLeaderboardEntry>` from `SwimsDataAccess.ViewModels` |

**Files touched, in order**

| File | Change |
| --- | --- |
| `src/libs/dotnet/swims-data-access/Repositories/ITimeLeaderboardRepository.cs` | Create |
| `src/libs/dotnet/swims-data-access/Repositories/TimeLeaderboardRepository.cs` | Create |
| `src/libs/dotnet/swims-common-services/DependencyInjection.cs` | Register the repository |
| `src/apps/dotnet/times-api/times-api/Services/ITimeLeaderboardService.cs` | Create |
| `src/apps/dotnet/times-api/times-api/Services/TimeLeaderboardService.cs` | Create |
| `src/apps/dotnet/times-api/times-api/DependencyInjection.cs` | Register the service |
| `src/apps/dotnet/times-api/times-api/Controllers/TimeLeaderboardController.cs` | Create |

**Repository**

Dapper, so no `.Filter(...)`. Scoping has to be a parameter of the proc, and here `currentPersonId` is passed through as one.

```csharp
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SwimsDataAccess.Models;
using SwimsDataAccess.ViewModels;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;

namespace SwimsDataAccess.Repositories
{
    public class TimeLeaderboardRepository : BaseRepository, ITimeLeaderboardRepository
    {
        public IConfiguration Configuration { get; }

        public TimeLeaderboardRepository(dbContext dbContext, IConfiguration configuration)
            : base(dbContext)
        {
            Configuration = configuration;
        }

        public async Task<IList<TimeLeaderboardEntry>> GetTimeLeaderboard(long currentPersonId, int eventId)
        {
            IList<TimeLeaderboardEntry> results = new List<TimeLeaderboardEntry>();
            try
            {
                string con = Configuration.GetConnectionString("USAS_DW_USAS_API");
                using (IDbConnection db = new SqlConnection(con))
                {
                    var parms = new { currentPersonId = currentPersonId, eventId = eventId };
                    string readSp = "app.GetTimeLeaderboard";
                    return (await db.QueryAsync<TimeLeaderboardEntry>(readSp, param: parms, commandType: CommandType.StoredProcedure))
                        .ToList();
                }
            }
            catch (DbUpdateException ex)
            {
                HandleException(ex, "GetTimeLeaderboard", $"EventId = {eventId}");
            }
            catch (Exception ex)
            {
                HandleException(ex, "GetTimeLeaderboard", $"EventId = {eventId}");
            }
            return results;
        }
    }
}
```

The interface is the one signature, in `SwimsDataAccess.Repositories`.

**Service and interface**

Straight pass-through in `Swims.Services`, constructor-injecting `ITimeLeaderboardRepository`. Same shape as the service in `reference/layers.md`.

**Controller**

New class, so the attributes and base class come with it. `[UsasEncryptionHandler]` is absent, which is why `eventId` can be `int` rather than a `string` parsed in the body.

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swims.Handlers;
using Swims.Services;
using SwimsDataAccess.ViewModels;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Swims.Controllers
{
    [Route("swims/[controller]")]
    [ApiController]
    [UsasResponseHandler]
    public class TimeLeaderboardController : UsasBaseController
    {
        private readonly ITimeLeaderboardService _service;

        public TimeLeaderboardController(ITimeLeaderboardService service)
        {
            _service = service;
        }

        // GET: swims/TimeLeaderboard/Event/1
        [HttpGet("Event/{eventId}")]
        [Authorize(Roles = "<as answered by the user>")]
        public async Task<ActionResult<IList<TimeLeaderboardEntry>>> GetTimeLeaderboard(int eventId)
        {
            try
            {
                return await _service.GetTimeLeaderboard(base.GetCurrentPersonID(), eventId);
            }
            catch
            {
                return StatusCode(500);
            }
        }
    }
}
```

The route is `swims/TimeLeaderboard/Event/{eventId}`, because `[controller]` resolves to the class name minus the `Controller` suffix.

**DI**

Two files, two projects. This is the step to double-check.

```csharp
// src/libs/dotnet/swims-common-services/DependencyInjection.cs, alphabetically
services.AddScoped<ITimeLeaderboardRepository, TimeLeaderboardRepository>();

// src/apps/dotnet/times-api/times-api/DependencyInjection.cs, in the services block
services.AddScoped<ITimeLeaderboardService, TimeLeaderboardService>();
```

Nothing registers the controller. ASP.NET discovers it.

**Verify**

```
nx affected -t build --files=src/libs/dotnet/swims-data-access/Repositories/TimeLeaderboardRepository.cs,src/apps/dotnet/times-api/times-api/Controllers/TimeLeaderboardController.cs
```

A missing DI registration builds clean and fails at the first request with an unresolved-dependency error, so confirm both `AddScoped` lines landed rather than trusting the build.
