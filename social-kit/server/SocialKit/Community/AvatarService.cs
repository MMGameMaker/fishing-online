using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace SocialKit.Community;

/// <summary>Tải ảnh đại diện từ nhà cung cấp (chỉ host cho phép, tối đa 512 KB, phải là ảnh) và lưu vào DB.</summary>
public interface IAvatarService
{
    /// <summary>Không bao giờ ném lỗi: đăng nhập không được hỏng vì ảnh đại diện.</summary>
    Task RefreshAsync(Guid playerId, string? pictureUrl, string provider, CancellationToken ct);
}

public sealed class AvatarService(DbContext db, HttpClient http, TimeProvider time, ILogger<AvatarService> logger) : IAvatarService
{
    public const int MaxBytes = 512 * 1024;

    private static readonly string[] AllowedHostSuffixes = ["googleusercontent.com", "graph.facebook.com", "fbcdn.net", "fbsbx.com"];

    public static bool IsAllowedUrl(string? url, out Uri? uri)
    {
        uri = null;
        if (!Uri.TryCreate(url, UriKind.Absolute, out var parsed) || parsed.Scheme != Uri.UriSchemeHttps) return false;
        var host = parsed.Host.ToLowerInvariant();
        if (!AllowedHostSuffixes.Any(suffix => host == suffix || host.EndsWith("." + suffix, StringComparison.Ordinal))) return false;
        uri = parsed;
        return true;
    }

    public async Task RefreshAsync(Guid playerId, string? pictureUrl, string provider, CancellationToken ct)
    {
        if (!IsAllowedUrl(pictureUrl, out var uri) || uri is null) return;
        try
        {
            var existing = await db.Set<PlayerAvatar>().SingleOrDefaultAsync(row => row.PlayerId == playerId, ct);
            var now = time.GetUtcNow();
            // Cùng URL và mới tải dưới 6 giờ thì khỏi tải lại (đăng nhập liên tục).
            if (existing is not null && existing.SourceUrl == uri.ToString() && now - existing.UpdatedAt < TimeSpan.FromHours(6)) return;

            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeout.CancelAfter(TimeSpan.FromSeconds(4));
            using var response = await http.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, timeout.Token);
            if (!response.IsSuccessStatusCode) return;
            var contentType = response.Content.Headers.ContentType?.MediaType ?? string.Empty;
            if (!contentType.StartsWith("image/", StringComparison.Ordinal)) return;
            if (response.Content.Headers.ContentLength > MaxBytes) return;
            await using var stream = await response.Content.ReadAsStreamAsync(timeout.Token);
            using var buffer = new MemoryStream();
            var chunk = new byte[16 * 1024];
            int read;
            while ((read = await stream.ReadAsync(chunk, timeout.Token)) > 0)
            {
                buffer.Write(chunk, 0, read);
                if (buffer.Length > MaxBytes) return;
            }
            if (buffer.Length == 0) return;

            if (existing is null)
            {
                existing = new PlayerAvatar { PlayerId = playerId };
                db.Add(existing);
            }
            existing.ContentType = contentType;
            existing.Data = buffer.ToArray();
            existing.Provider = provider;
            existing.SourceUrl = uri.ToString();
            existing.UpdatedAt = now;
            await db.SaveChangesAsync(ct);
        }
        catch (Exception exception) when (exception is not OperationCanceledException || !ct.IsCancellationRequested)
        {
            logger.LogWarning(exception, "Could not refresh avatar for player {PlayerId}", playerId);
        }
    }
}
