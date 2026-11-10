using System.Collections.Concurrent;
using System.Diagnostics;
using System.Globalization;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR.Client;
using Npgsql;

// BE-C-08: 20 kết nối cùng hồ, mỗi kết nối mua vé rồi đi lại 10 lần/giây quanh điểm spawn. Server phải bật Auth:DevBypass.
// Từ SPEC 0.9 người đang ngồi ghế không được đi lại, nên phần đo di chuyển không ngồi ghế.
var arguments = Enumerable.Range(0, args.Length / 2).ToDictionary(index => args[index * 2].TrimStart('-'), index => args[index * 2 + 1]);
var baseUrl = arguments.GetValueOrDefault("url", "http://127.0.0.1:5199");
var seconds = int.Parse(arguments.GetValueOrDefault("seconds", "120"), CultureInfo.InvariantCulture);
var clients = int.Parse(arguments.GetValueOrDefault("clients", "20"), CultureInfo.InvariantCulture);
var database = arguments["database"];
var priceVersion = arguments.GetValueOrDefault("price-version", "ticket-price-test-01");
var serverProcess = arguments.TryGetValue("server-pid", out var pidText) ? Process.GetProcessById(int.Parse(pidText, CultureInfo.InvariantCulture)) : null;

const int MovesPerSecond = 10;
const double StepPx = 4;

var http = new HttpClient { BaseAddress = new Uri(baseUrl) };
var players = Enumerable.Range(0, clients).Select(_ => Guid.NewGuid()).ToArray();
foreach (var playerId in players)
{
    using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/me");
    request.Headers.Add("X-Dev-Player", playerId.ToString());
    (await http.SendAsync(request)).EnsureSuccessStatusCode();
}

// Người chơi mới không đủ Gold cho Tier 1, nên cấp thêm trực tiếp trong database tải.
await using (var connection = new NpgsqlConnection(database))
{
    await connection.OpenAsync();
    await using var command = new NpgsqlCommand("""update game.wallets set "Gold" = 100000""", connection);
    await command.ExecuteNonQueryAsync();
}

var sentAt = new ConcurrentDictionary<(Guid Player, long Seq), long>();
var latenciesMs = new ConcurrentBag<double>();
var errors = new ConcurrentBag<string>();
var moved = 0L;
var sent = 0L;

var connections = new List<HubConnection>();
foreach (var playerId in players)
{
    var hub = new HubConnectionBuilder().WithUrl(new Uri(new Uri(baseUrl), "/hubs/game"),
        options => options.Headers["X-Dev-Player"] = playerId.ToString()).Build();
    hub.On<JsonElement>("PlayerMoved", payload =>
    {
        var key = (payload.GetProperty("playerId").GetGuid(), payload.GetProperty("seq").GetInt64());
        if (key.Item2 <= 0 || !sentAt.TryGetValue(key, out var startedAt)) return;
        latenciesMs.Add(Stopwatch.GetElapsedTime(startedAt).TotalMilliseconds);
        Interlocked.Increment(ref moved);
    });
    hub.On<JsonElement>("PositionCorrected", payload =>
    {
        if (payload.GetProperty("seq").GetInt64() > 0) errors.Add("PositionCorrected");
    });
    hub.Closed += exception =>
    {
        errors.Add("closed: " + exception?.GetType().Name);
        return Task.CompletedTask;
    };
    await hub.StartAsync();
    connections.Add(hub);
}

JsonElement Check(JsonElement ack, string name)
{
    if (!ack.GetProperty("ok").GetBoolean()) throw new InvalidOperationException($"{name}: {ack.GetRawText()}");
    return ack;
}

var seats = new List<(double X, double Y)>();
for (var index = 0; index < clients; index++)
{
    var snapshot = Check(await connections[index].InvokeAsync<JsonElement>("JoinLake", new { requestId = Guid.NewGuid().ToString() }), "JoinLake");
    Check(await connections[index].InvokeAsync<JsonElement>("BuyTicket", new
    {
        requestId = Guid.NewGuid().ToString(), quantity = 1, expectedPriceVersion = priceVersion,
    }), "BuyTicket");
    _ = snapshot;
}

var map = JsonDocument.Parse(await File.ReadAllTextAsync(arguments.GetValueOrDefault("map", "docs/v01/fixtures/lake-map.placeholder.json")));
var spawn = map.RootElement.GetProperty("spawn");
seats.AddRange(Enumerable.Repeat((spawn.GetProperty("x").GetDouble(), spawn.GetProperty("y").GetDouble()), clients));

var cpuBefore = serverProcess?.TotalProcessorTime ?? TimeSpan.Zero;
var clock = Stopwatch.StartNew();
long peakWorkingSet = 0;
using var stop = new CancellationTokenSource(TimeSpan.FromSeconds(seconds));

var sampling = Task.Run(async () =>
{
    while (!stop.IsCancellationRequested && serverProcess is not null)
    {
        serverProcess.Refresh();
        peakWorkingSet = Math.Max(peakWorkingSet, serverProcess.WorkingSet64);
        try { await Task.Delay(1000, stop.Token); } catch (OperationCanceledException) { break; }
    }
});

var movers = Enumerable.Range(0, clients).Select(index => Task.Run(async () =>
{
    var hub = connections[index];
    var playerId = players[index];
    var (seatX, seatY) = seats[index];
    using var timer = new PeriodicTimer(TimeSpan.FromMilliseconds(1000d / MovesPerSecond));
    long seq = 1000;
    try
    {
        while (await timer.WaitForNextTickAsync(stop.Token))
        {
            seq++;
            var x = seatX + (seq % 2 == 0 ? StepPx : -StepPx);
            sentAt[(playerId, seq)] = Stopwatch.GetTimestamp();
            Interlocked.Increment(ref sent);
            var ack = await hub.InvokeAsync<JsonElement>("Move", new { requestId = Guid.NewGuid().ToString(), seq, x, y = seatY, dir = "right" }, stop.Token);
            if (!ack.GetProperty("ok").GetBoolean()) errors.Add(ack.GetProperty("error").GetProperty("code").GetString()!);
        }
    }
    catch (OperationCanceledException)
    {
        // Hết thời gian chạy.
    }
})).ToArray();

await Task.WhenAll(movers);
await sampling;
var elapsed = clock.Elapsed;
await Task.Delay(500);

var sorted = latenciesMs.Order().ToArray();
double Percentile(double fraction) => sorted.Length == 0 ? double.NaN : sorted[(int)Math.Ceiling(fraction * sorted.Length) - 1];
var cpu = serverProcess is null ? double.NaN : (serverProcess.TotalProcessorTime - cpuBefore).TotalSeconds / elapsed.TotalSeconds / Environment.ProcessorCount * 100;

Console.WriteLine(JsonSerializer.Serialize(new
{
    clients,
    seconds = Math.Round(elapsed.TotalSeconds, 1),
    movesSent = sent,
    playerMovedReceived = moved,
    errors = errors.Count,
    errorKinds = errors.GroupBy(error => error).ToDictionary(group => group.Key, group => group.Count()),
    latencyMs = new { p50 = Math.Round(Percentile(0.5), 2), p95 = Math.Round(Percentile(0.95), 2), p99 = Math.Round(Percentile(0.99), 2), max = sorted.Length == 0 ? 0 : Math.Round(sorted[^1], 2) },
    serverCpuPercentOfMachine = Math.Round(cpu, 1),
    serverPeakWorkingSetMb = Math.Round(peakWorkingSet / 1024d / 1024d, 1),
    logicalProcessors = Environment.ProcessorCount,
}, new JsonSerializerOptions { WriteIndented = true }));

// Tính trước khi đóng kết nối, vì sự kiện Closed lúc dọn dẹp không phải lỗi.
var passed = errors.IsEmpty && Percentile(0.95) < 150;
foreach (var hub in connections) await hub.DisposeAsync();
return passed ? 0 : 1;
