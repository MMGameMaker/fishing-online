using SocialKit.Community;

namespace SocialKit.Tests;

/// <summary>Cộng đồng Facebook (2026-11-27), phần không cần DB.</summary>
public sealed class CommunityUnitTests
{
    [Theory]
    [InlineData("https://lh3.googleusercontent.com/a/abc=s96-c", true)]
    [InlineData("https://graph.facebook.com/123/picture?type=large", true)]
    [InlineData("https://scontent-sin6-1.xx.fbcdn.net/v/t1.0/abc.jpg", true)]
    [InlineData("https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=1", true)]
    [InlineData("http://lh3.googleusercontent.com/a/abc", false)] // không phải https
    [InlineData("https://evil.example.com/a.png", false)]
    [InlineData("https://googleusercontent.com.evil.com/a.png", false)] // host giả
    [InlineData("https://notfbcdn.net/a.png", false)]
    [InlineData("http://127.0.0.1:5432/", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void AvatarUrl_OnlyAllowedHosts(string? url, bool allowed) =>
        Assert.Equal(allowed, AvatarService.IsAllowedUrl(url, out _));

    [Theory]
    [InlineData("feed", true)]
    [InlineData("group", true)]
    [InlineData("Feed", false)]
    [InlineData("page", false)]
    [InlineData(null, false)]
    public void ShareKind_IsValidated(string? kind, bool valid) => Assert.Equal(valid, ShareKinds.IsValid(kind));

    [Fact]
    public void CodeAttempts_AreLimitedPerPlayerPerHour()
    {
        var limiter = new CodeAttemptLimiter();
        var player = Guid.NewGuid();
        var start = DateTimeOffset.UtcNow;
        for (var i = 0; i < 3; i++) Assert.True(limiter.TryAcquire(player, start, 3));
        Assert.False(limiter.TryAcquire(player, start.AddMinutes(10), 3));
        Assert.True(limiter.TryAcquire(Guid.NewGuid(), start, 3)); // người khác không bị ảnh hưởng
        Assert.True(limiter.TryAcquire(player, start.AddMinutes(61), 3)); // quá 1 giờ thì được thử lại
    }
}
