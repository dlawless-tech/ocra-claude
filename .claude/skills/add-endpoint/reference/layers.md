# Layers

Where each layer lives and what its code looks like. Shapes here are the common case. A neighboring slice in the target API always wins over this file.

## Map

| Layer | Path | Namespace | Shared? |
| --- | --- | --- | --- |
| Controller | `src/apps/dotnet/<api>/<api>/Controllers/` | `Swims.Controllers` | Per API |
| Service and interface | `src/apps/dotnet/<api>/<api>/Services/` | `Swims.Services` | Per API |
| Repository and interface | `src/libs/dotnet/swims-data-access/Repositories/` | `SwimsDataAccess.Repositories` | **All ten APIs** |
| Entity models | `src/libs/dotnet/swims-data-access/Models/` | `SwimsDataAccess.Models` | All ten APIs |
| View models | `src/libs/dotnet/swims-data-access/ViewModels/` | `SwimsDataAccess.ViewModels` | All ten APIs |
| Service DI | `src/apps/dotnet/<api>/<api>/DependencyInjection.cs` | | Per API |
| Repository DI | `src/libs/dotnet/swims-common-services/DependencyInjection.cs` | | All ten APIs |

Interfaces sit in the same folder as their implementation, one file each, named `IFoo.cs`. There is no separate `Interfaces` folder.

The repository layer is shared by every API. Editing it fans out across the estate, so add a method rather than changing an existing signature.

## Return type

| Situation | Use |
| --- | --- |
| Returning a table row as-is | The entity in `SwimsDataAccess.Models` |
| Returning a projection, a join, or a stored-procedure result | A view model in `SwimsDataAccess.ViewModels` |
| The payload carries encrypted fields | The `_enc` view model variant, paired with `[UsasEncryptionHandler]` on the action |

Entity models and their `DbSet` entries in `Models/dbContext.cs` are scaffolded from the database. Do not hand-write a new one. If the endpoint needs an entity that does not exist, stop and say so.

## Controller

Route is `swims/[controller]`. The class inherits `UsasBaseController` and carries `[ApiController]` and `[UsasResponseHandler]`.

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swims.Handlers;
using Swims.Services;
using SwimsDataAccess.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Swims.Controllers
{
    [Route("swims/[controller]")]
    [ApiController]
    [UsasResponseHandler]
    public class PersonNarrativeController : UsasBaseController
    {
        private readonly IPersonNarrativeService _service;

        public PersonNarrativeController(IPersonNarrativeService service)
        {
            _service = service;
        }

        // GET: swims/PersonNarrative/Person/1
        [UsasEncryptionHandler]
        [HttpGet("Person/{personId}")]
        [Authorize(Roles = "Member Edit - Narratives, Member Read")]
        public async Task<ActionResult<IList<PersonNarrative>>> GetPersonNarrativeForPersonId(string personId)
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
                return await _service.GetPersonNarrativeForPersonId(base.GetCurrentPersonID(), pId);
            }
            catch
            {
                return StatusCode(500);
            }
        }
    }
}
```

Conventions that hold across controllers:

- The caller's identity comes from `base.GetCurrentPersonID()` and is passed as the first argument down every layer. It is never taken from the request.
- Every action body is wrapped in `try` / `catch` returning `StatusCode(500)`.
- A comment above each action spells out the concrete URL, as in `// GET: swims/PersonNarrative/Person/1`.
- An encrypted identifier is declared `string` and parsed inside the `try`. See the encryption section below.
- A `personId` of `0` means "the caller", and falls back to `base.GetCurrentPersonID()`.

Per method:

| Method | Attribute | Returns |
| --- | --- | --- |
| GET one | `[HttpGet("{id}")]` | `ActionResult<T>`, `NotFound()` when absent |
| GET many | `[HttpGet("Route/{param}")]` | `ActionResult<IList<T>>` |
| POST | `[HttpPost()]` | `CreatedAtAction(nameof(Action), new { id = created.Id }, created)` |
| PUT | `[HttpPut("{id}")]` | `ActionResult<T>`, `BadRequest()` when the route id and body id disagree, `NotFound()` when absent |
| DELETE | `[HttpDelete("{id}")]` | `ActionResult<T>` returning the deleted row, `NotFound()` when absent |

Where the request body is an `_enc` view model, the action round-trips it to the entity through `JsonConvert` before calling the service.

## Encryption

`[UsasEncryptionHandler]` is an `ActionFilterAttribute` living in each API's `Handlers/` folder, namespace `Swims.Handlers`. It runs in `OnActionExecuting`, before the action body.

What it does to each action argument:

| Argument | Handling |
| --- | --- |
| Named `id`, or any name containing `Id` | URL-decoded, `-` and `.` mapped back to `+` and `/`, and if the result is Base64 it is decrypted with `CryptoEngine.Decrypt` and **written back as a `string`** |
| A JSON object, such as an `_enc` view model | Secure fields decrypted through `ISecureFieldService` and rebound to the original parameter type |
| Anything else | Left alone |

The consequences for the signature:

- **Encrypted identifiers must be declared `string`.** Two independent reasons. Model binding runs before the filter, so a Base64 blob bound to `long` is already a 400. And the filter assigns a `string` into the argument slot, which only works if the parameter is one.
- Parse in the body, as the first line inside the `try`, so a malformed value takes the action's own 500 path rather than throwing unhandled:

  ```csharp
  long pId = long.Parse(personId);
  ```

- The filter keys off the parameter **name**, not its type or value. `personId` and `narrativeTypeId` both match `Contains("Id")`. A parameter named `personKey` never gets decrypted. Name identifiers `...Id`.
- The decrypt branch only fires when the value is Base64, so a genuinely numeric `narrativeTypeId` passes through untouched and can stay `int`. Do not convert every parameter to `string` just because the attribute is present.
- The filter requires a `Usas-Sub-Id` request header and returns 400 without one. Adding the attribute to an endpoint that already has callers is a breaking change.

Put the attribute on the action, never on the class.

## Service

A pass-through by default. It exists as a seam, so do not add logic that is not asked for.

```csharp
using SwimsDataAccess.Models;
using SwimsDataAccess.Repositories;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Swims.Services
{
    public class PersonNarrativeService : IPersonNarrativeService
    {
        private readonly IPersonNarrativeRepository _repository;

        public PersonNarrativeService(IPersonNarrativeRepository repository)
        {
            _repository = repository;
        }

        public async Task<List<PersonNarrative>> GetPersonNarrativeForPersonId(long currentPersonId, long personId)
        {
            return await _repository.GetPersonNarrativeForPersonId(currentPersonId, personId);
        }
    }
}
```

The interface is the same method list with no bodies, in `Swims.Services`.

## Repository, Entity Framework

Inherits `BaseRepository`, which supplies `DbContext`, `HandleDatabaseException`, and `HandleException`. Takes `IConfiguration` when the query filters by org unit.

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SwimsDataAccess.Models;
using SwimsDataAccess.Security;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SwimsDataAccess.Repositories
{
    public class PersonNarrativeRepository : BaseRepository, IPersonNarrativeRepository
    {
        private readonly IConfiguration _configuration;

        public PersonNarrativeRepository(IConfiguration configuration, dbContext dbContext)
            : base(dbContext)
        {
            _configuration = configuration;
        }

        public async Task<List<PersonNarrative>> GetPersonNarrativeForPersonId(long currentPersonId, long personId)
        {
            try
            {
                return await DbContext.PersonNarrative
                    .AsNoTracking()
                    .Where(pn => pn.PersonId == personId)
                    .Filter(_configuration, currentPersonId, SecuredByOrgUnit.Settings.Area.PersonNarrative)
                    .ToListAsync();
            }
            catch (DbUpdateException ex)
            {
                HandleDatabaseException(ex, "GetPersonNarrativeForPersonId", $"PersonId = {personId}");
            }
            catch (Exception ex)
            {
                HandleException(ex, "GetPersonNarrativeForPersonId", $"PersonId = {personId}");
            }
            return null;
        }
    }
}
```

Rules:

- `.AsNoTracking()` on reads, `.AsTracking()` only on the read that feeds an update.
- `.Filter(_configuration, currentPersonId, SecuredByOrgUnit.Settings.Area.X)` wherever siblings on the same entity use it. Use the same `Area` value they use.
- Both `catch` blocks are present on every method. The handlers log and rethrow, so the trailing `return null` or `return false` is unreachable but conventional. Keep it.
- The handler's second argument is the method name and the third is an interpolated string of the key inputs.
- Writes go `AddAsync` then `SaveChangesAsync`. Updates read the tracked entity, then call `UpdateCleanEntityAndChildren` from `BaseRepository`, then `SaveChangesAsync`, then re-read.

## Repository, Dapper

Used for stored procedures and for reads against the warehouse connection. Same base class, same exception handling, different body.

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
    public class AppImxRepository : BaseRepository, IAppImxRepository
    {
        public IConfiguration Configuration { get; }

        public AppImxRepository(dbContext dbContext, IConfiguration configuration)
            : base(dbContext)
        {
            Configuration = configuration;
        }

        public async Task<IList<DwImxLeaderboard.DwImxLeader>> GetImxLeaderboard(DwImxLeaderboardFilter filter)
        {
            IList<DwImxLeaderboard.DwImxLeader> results = new List<DwImxLeaderboard.DwImxLeader>();
            try
            {
                string con = Configuration.GetConnectionString("USAS_DW_USAS_API");
                using (IDbConnection db = new SqlConnection(con))
                {
                    var parms = new { ImxSeasonKey = filter.ImxSeasonKey, lscId = filter.LscId };
                    string readSp = "app.GetImxLeaderboard";
                    return (await db.QueryAsync<DwImxLeaderboard.DwImxLeader>(readSp, param: parms, commandType: CommandType.StoredProcedure))
                        .ToList();
                }
            }
            catch (DbUpdateException ex)
            {
                HandleException(ex, "GetImxLeaderboard", "");
            }
            catch (Exception ex)
            {
                HandleException(ex, "GetImxLeaderboard", "");
            }
            return results;
        }
    }
}
```

Rules:

- Parameters go through the anonymous `param:` object. Never build SQL by string concatenation.
- `commandType: CommandType.StoredProcedure` for a proc. The proc must already exist. This skill does not create one.
- Take the connection string by name from `IConfiguration`. `USAS_API` is the transactional database, `USAS_DW_USAS_API` the warehouse. Copy the name a sibling method uses rather than guessing.
- The connection is scoped by `using`. The `dbContext` still comes in through the constructor because `BaseRepository` requires it.
- `.Filter(...)` does not apply here. If the result needs org-unit scoping, it has to be a parameter of the proc.

## DI registration

Service, in `src/apps/dotnet/<api>/<api>/DependencyInjection.cs`, in the alphabetical block at the top. The block is commented `//services` in some APIs and `//<api> services` in others:

```csharp
services.AddScoped<IPersonNarrativeService, PersonNarrativeService>();
```

Repository, in `src/libs/dotnet/swims-common-services/DependencyInjection.cs`, alphabetically:

```csharp
services.AddScoped<IPersonNarrativeRepository, PersonNarrativeRepository>();
```

The per-API file also carries a long commented-out block of repository registrations. It is dead. Do not uncomment it, do not add to it, and do not treat a commented-out line there as evidence the repository is unregistered.
