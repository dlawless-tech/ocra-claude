---
name: snowflake-read
description: Snowflake reads in the .NET APIs — the ISnowflakeQueryService call shape every DATA.* procedure read uses. Use when adding or changing an endpoint that needs Snowflake data, calling a DATA.* stored procedure from C#, or when a Snowflake read comes back empty, garbled, or refused for a missing Device-Id.
---

# Snowflake reads

A **Snowflake read** calls one `DATA.*` stored procedure through `ISnowflakeQueryService` and deserializes its JSON into an `SF*` view model. Roughly 40 call sites do this; match them rather than inventing a fourth data-access pattern.

Two worked examples, and the only two shapes to choose between:

| Where the read lives | Example | Use when |
|---|---|---|
| The controller action | [`RosterController.GetRosterForFilters`](../../../src/apps/dotnet/person-api/person-api/Controllers/RosterController.cs) | The endpoint is the read, with no other logic to own |
| A service method | [`PersonGoalService.GetApplicableTimeStandards`](../../../src/apps/dotnet/person-api/person-api/Services/PersonGoalService.cs) | The read is one step among authorization, repository work, or merging |

Prefer the service when anything but the read is happening, so the controller stays a thin action. Do not add a gateway or an interface per procedure.

## Steps

1. **Add the view model** to `src/libs/dotnet/swims-data-access/ViewModels` as `SF<Thing>.cs`. Property names match the procedure's output columns; the service camel-cases its JSON and Newtonsoft matches case-insensitively, so PascalCase properties bind.
2. **Inject** `IConfiguration` and `ISnowflakeQueryService`, and hold `_snowflakeDatabase = configuration["SnowflakeDatabase"]`. `swims-common-services/DependencyInjection.cs` already registers `ISnowflakeQueryService` for every API, so add no registration of your own.
3. **Name the procedure** as a `private const string`, qualified from the database down: `@"DATA.GETCLUBROSTER"`.
4. **Write the read** using the skeleton below.
5. **Guard the qualifier.** Throw when `_snowflakeDatabase` is empty rather than concatenating it. Unset, it yields `FROM TABLE (.DATA.GETX(...))`, which fails as if the data were missing — live today in times-api, tracked in `docs/initiatives/README.md`.
6. **Decide what an unreachable Snowflake answers.** No rows and no answer are different facts. `RosterController` returns 500 for both; `PersonGoalController` wraps the failure and answers 503 so an empty picker is never rendered as a real empty set. Pick deliberately and say which in a comment.
7. **Attribute the endpoint** like its neighbours: `[UsasEncryptionHandler]`, `[Authorize(Roles = "...")]`, and an `_enc` view model for a POST body.
8. **Build it.** `nx run <api>:build`. Done when the build is green and every `:NAME` in `queryParams` has a `SnowflakeParameter` of the same name, in the procedure's parameter order.

### Skeleton

```csharp
SnowflakeParameter[] parameters = new SnowflakeParameter[]
{
    new SnowflakeParameter("MID", DbType.String, memberId),
    new SnowflakeParameter("EVENTID", DbType.Int64, eventId)
};

string queryParams = @"
    (
        :MID,
        :EVENTID
    )
 ";

string query = "SELECT * FROM TABLE (" + _snowflakeDatabase + "." + TimeStandardsProcedure + queryParams + ")";

string ret = await _snowflakeService.ExecuteSnowflakeProc(query, parameters, TimeStandardsProcedure);

if (ret == null)
{
    return new List<SFGoalTimeStandard>();
}

return JsonConvert.DeserializeObject<List<SFGoalTimeStandard>>(Regex.Unescape(ret)) ?? new List<SFGoalTimeStandard>();
```

Values are always bound as parameters, never interpolated into the string. Only the database and procedure name are concatenated.

## What the query service does to your data

Consult when a read returns something unexpected. All of it is `SnowflakeQueryService.ExecuteSnowflakeProc`.

- **`procedureBaseName` is not logging.** It drives the `Device-Id` access gate: the third argument is passed to `CheckDeviceRequiredForProc` and `CheckAccessLimitForDevice`. Where a procedure is registered as device-required and the request carries no `Device-Id` header, the call throws before Snowflake is touched. Pass the same const you built the query from. `isReport: true` skips the gate.
- **Null is a real argument.** Each value becomes `DBNull.Value` when null, so a procedure that treats null as "no filter" is called with nulls. That is how `RosterController` gets the unfiltered roster from the same procedure in a second call.
- **Every column comes back camelCased**, from a `CamelCasePropertyNamesContractResolver`.
- **A string column containing `[` is parsed as a JSON array** into `List<Dictionary<string, object>>`. Intended for splits; a text column that merely contains a bracket is reshaped by it.
- **`Regex.Unescape` is part of the pattern**, because column values arrive escaped. It also unescapes legitimate `\"` and `\\` inside a value, so a text column returning mangled content is this line.
- **Failure throws a plain `Exception`** whose message carries the SQL, the parameter values, and the step it reached. Catch broadly, and keep it out of the response body.

## Local dev

Snowflake is unreachable from a developer machine, so these endpoints cannot be exercised locally and there is no stub to select: a Snowflake-backed endpoint is verified by building it and reading it against the procedure's signature. `SnowflakeDatabase` is absent from the supplied dev config, and `ConnectionStrings:SnowflakeConnectionString` is what the service reads.

## This shape is on its way out

`docs/conventions/dotnet-api.md` names the concatenated `SELECT * FROM TABLE (...)` construction as the pattern to stop copying. Follow it anyway for a new read, because one consistent shape across 40 call sites is worth more than a 41st variant, and raise the replacement as its own change rather than inventing one mid-endpoint.
