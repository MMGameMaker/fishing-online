using Microsoft.AspNetCore.SignalR;

namespace FishingOnline.Api.Modules.Common;

/// <summary>
/// Hub chính <c>/hubs/game</c>. Mỗi module thêm file <c>GameHub.&lt;Module&gt;.cs</c> trong thư mục của mình,
/// khai báo <c>public sealed partial class GameHub</c> cùng namespace này. Không thêm constructor:
/// lấy service bằng tham số <c>[FromServices]</c> trên từng method để các module không đụng nhau.
/// </summary>
public sealed partial class GameHub : Hub;
