using System.Collections.Concurrent;
using System.Text.Json.Nodes;
using FishingOnline.Api.Modules.Common;
using FishingOnline.Api.Persistence;
using FishingOnline.Domain.Config;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FishingOnline.Api.Modules.Config;

public interface IConfigProvider
{
    GameplayConfig Current { get; }
    GameplayConfig Get(string version);
}

public sealed class ConfigVersionRow
{
    public string Version { get; set; } = string.Empty;
    public string Json { get; set; } = string.Empty;
    public DateTimeOffset PublishedAt { get; set; }
    public string PublishedBy { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public sealed class ConfigVersionRowConfig : IEntityTypeConfiguration<ConfigVersionRow>
{
    public void Configure(EntityTypeBuilder<ConfigVersionRow> entity)
    {
        entity.ToTable("config_versions");
        entity.HasKey(row => row.Version);
        entity.Property(row => row.Version).HasMaxLength(128);
        entity.Property(row => row.PublishedBy).HasMaxLength(128);
        entity.Property(row => row.Json).HasColumnType("jsonb");
        entity.HasIndex(row => row.IsActive).IsUnique().HasFilter("\"IsActive\"").HasDatabaseName("IX_config_versions_single_active");
    }
}

/// <summary>Kiểm tra config trước khi dùng. Các mốc số là hình dạng bắt buộc của bản v0.1 (BE-A-05).</summary>
public static class GameplayConfigValidator
{
    private const int LevelCount = 10;
    private const int TotalExpRequired = 1850;
    private const int SpeciesCount = 9;
    private const int BasisPointTotal = 10000;

    public static IReadOnlyList<string> Validate(GameplayConfig config)
    {
        var errors = new List<string>();
        if (config.Levels.Count != LevelCount) errors.Add($"levels: cần {LevelCount} level, có {config.Levels.Count}.");
        var totalExp = config.Levels.Sum(level => level.ExpReq);
        if (totalExp != TotalExpRequired) errors.Add($"levels: tổng expReq phải {TotalExpRequired}, đang là {totalExp}.");

        var defaults = config.Rods.Count(rod => rod.IsDefault);
        if (defaults != 1) errors.Add($"rods: cần đúng 1 cần mặc định, có {defaults}.");

        if (config.Fish.Count != SpeciesCount) errors.Add($"fish: cần {SpeciesCount} loài, có {config.Fish.Count}.");
        errors.AddRange(config.Fish.Where(fish => fish.MinTenthCm > fish.MaxTenthCm)
            .Select(fish => $"fish: {fish.SpeciesId} có min lớn hơn max."));

        for (var luck = 0; luck <= config.LengthTiers.MaxLargeLuck; luck++)
        {
            var total = config.LengthTiers.Tiers.Sum(tier => tier.BaseBp + tier.PerLuckBp * luck);
            if (total != BasisPointTotal) errors.Add($"lengthTiers: tổng bp với L={luck} là {total}, phải {BasisPointTotal}.");
        }

        var missing = Enum.GetValues<Rarity>().Except(config.Minigame.Rarity.Select(row => row.Rarity)).ToArray();
        if (missing.Length > 0 || config.Minigame.Rarity.Count != Enum.GetValues<Rarity>().Length)
            errors.Add($"minigame: phải đủ 5 rarity, thiếu [{string.Join(", ", missing)}].");

        var pricing = config.TicketPricing;
        if (pricing.BillingUnitMinutes <= 0 || pricing.UnitPriceGold <= 0 || pricing.MaxUnitsPerPurchase <= 0)
            errors.Add("ticketPricing: billingUnitMinutes, unitPriceGold và maxUnitsPerPurchase phải lớn hơn 0.");
        if (string.IsNullOrWhiteSpace(pricing.PriceVersion)) errors.Add("ticketPricing: thiếu priceVersion.");

        return errors;
    }
}

public sealed class InvalidGameplayConfigException(IReadOnlyList<string> errors)
    : InvalidOperationException("Gameplay config is invalid: " + string.Join(" ", errors))
{
    public IReadOnlyList<string> Errors { get; } = errors;
}

public sealed class ConfigProvider : IConfigProvider
{
    private readonly ConcurrentDictionary<string, GameplayConfig> versions = new();
    private volatile GameplayConfig? current;

    public GameplayConfig Current => current ?? throw new InvalidOperationException("Gameplay config has not been loaded.");

    public GameplayConfig Get(string version) =>
        versions.TryGetValue(version, out var config)
            ? config
            : throw new InvalidOperationException($"Unknown config version '{version}'.");

    public void Store(GameplayConfig config, bool isActive)
    {
        var errors = GameplayConfigValidator.Validate(config);
        if (errors.Count > 0) throw new InvalidGameplayConfigException(errors);
        versions[config.ConfigVersion] = config;
        if (isActive) current = config;
    }
}

/// <summary>Chạy trước khi nhận request: bảng trống thì nạp fixture làm version đầu, rồi cache mọi version.</summary>
public sealed class ConfigBootstrapper(
    IServiceScopeFactory scopes, ConfigProvider provider, IConfiguration configuration, IHostEnvironment environment, TimeProvider time)
    : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        if (!await db.Set<ConfigVersionRow>().AnyAsync(cancellationToken))
        {
            var path = Path.GetFullPath(configuration["Gameplay:ConfigPath"]
                ?? throw new InvalidOperationException("Gameplay:ConfigPath is not configured."), environment.ContentRootPath);
            var json = await File.ReadAllTextAsync(path, cancellationToken);
            var config = GameplayConfigJson.Parse(json);
            var errors = GameplayConfigValidator.Validate(config);
            if (errors.Count > 0) throw new InvalidGameplayConfigException(errors);
            db.Add(new ConfigVersionRow
            {
                Version = config.ConfigVersion,
                Json = GameplayConfigJson.Serialize(config),
                PublishedAt = time.GetUtcNow(),
                PublishedBy = "system:fixture",
                IsActive = true,
            });
            try
            {
                await db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException exception) when (exception.UniqueConstraint() is not null)
            {
                // Instance khác vừa nạp xong; dùng dữ liệu của nó ở bước đọc bên dưới.
                db.ChangeTracker.Clear();
            }
        }

        foreach (var row in await db.Set<ConfigVersionRow>().AsNoTracking().ToListAsync(cancellationToken))
            provider.Store(GameplayConfigJson.Parse(row.Json), row.IsActive);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}

public static class ConfigModule
{
    public static IServiceCollection AddConfigModule(this IServiceCollection services)
    {
        services.AddSingleton<ConfigProvider>();
        services.AddSingleton<IConfigProvider>(provider => provider.GetRequiredService<ConfigProvider>());
        services.AddHostedService<ConfigBootstrapper>();
        return services;
    }

    public static WebApplication MapConfigModule(this WebApplication app)
    {
        app.MapGet("/api/v1/catalog", (IConfigProvider provider) =>
        {
            var catalog = JsonNode.Parse(GameplayConfigJson.Serialize(provider.Current))!.AsObject();
            catalog.Remove("spawn");
            return ApiResult.Ok(catalog);
        });
        return app;
    }
}
