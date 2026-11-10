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
}
