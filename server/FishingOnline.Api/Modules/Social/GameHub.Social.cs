using FishingOnline.Api.Modules.Social;
using Microsoft.AspNetCore.Mvc;

namespace FishingOnline.Api.Modules.Common;

public sealed partial class GameHub
{
    public async Task<CommandAck> SendChat(SendChatCommand command, [FromServices] SocialService social)
    {
        await social.SendChatAsync(PlayerId, command.Text, Context.ConnectionAborted);
        return CommandAck.Success(command.RequestId);
    }

    public async Task<CommandAck> SendEmoji(SendEmojiCommand command, [FromServices] SocialService social)
    {
        await social.SendEmojiAsync(PlayerId, command.EmojiId);
        return CommandAck.Success(command.RequestId);
    }

    /// <summary>Tin riêng cho bạn bè (BOT-02); ack trả tin đã lưu, event DirectMessageReceived tới cả hai người.</summary>
    public async Task<CommandAck> SendDirectMessage(SendDirectMessageCommand command, [FromServices] SocialService social)
    {
        var message = await social.SendDirectAsync(PlayerId, command.ToPlayerId, command.Text, Context.ConnectionAborted);
        return CommandAck.Success(command.RequestId, message);
    }
}
