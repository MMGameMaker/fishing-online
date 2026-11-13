// Khung "Trò chuyện" và bảng "Biểu cảm" theo hình mẫu (feedback 2026-11-12), vẽ bằng DOM trên canvas.
// Tin nhắn lấy từ store (ChatReceived của Server); gửi qua SendChat/SendEmoji, Server kiểm tra lại
// độ dài, tần suất và danh sách emoji. Hiện/ẩn mọi khung qua ui/kit/motion.ts.
import type { Services } from '../core/services';
import type { HubEvents } from '../net/contract';
import { showError } from '../ui/kit/components';
import { animateIn, animateOut } from '../ui/kit/motion';
import { CHAT_MAX_LENGTH, chatCounter, formatChatTime, normalizeChat } from './chatFormat';
import { EMOJIS, EMOTE_SHEET_URL, loadEmoteFrames, type FrameRect } from './emojis';

const CLOSE_ICON = encodeURI('/mini game/Button Close.png');
const SKIN_DIR = '/assets/characters/';
/** Vùng mặt thỏ trong frame idle_down_0 (khung bake 120×140, chân ở 60,76). */
const FACE = { x: 44, y: 34, size: 34 };

type ChatMessage = HubEvents['ChatReceived'];

export interface SocialUiOptions {
  root: HTMLElement;
  services: Services;
  /** Đang gõ chữ: scene tắt phím di chuyển để WASD/F không điều khiển nhân vật. */
  onTyping: (typing: boolean) => void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function closeButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = el('button', 'social-panel__close');
  button.type = 'button';
  button.setAttribute('aria-label', label);
  const icon = el('img', '');
  icon.src = CLOSE_ICON;
  icon.alt = '';
  button.append(icon);
  button.addEventListener('click', onClick);
  return button;
}

const skinFaces = new Map<string, Promise<{ url: string; x: number; y: number } | null>>();

/** Mặt thỏ cắt từ frame đứng nhìn xuống của skin đã bake; skin chưa có art thì null. */
function faceOf(skinId: string): Promise<{ url: string; x: number; y: number } | null> {
  let face = skinFaces.get(skinId);
  if (!face) {
    face = fetch(`${SKIN_DIR}${skinId}.json`)
      .then((r) =>
        r.ok ? (r.json() as Promise<{ frames: Record<string, { frame: FrameRect }> }>) : null,
      )
      .then((data) => {
        const frame = data?.frames['idle_down_0']?.frame;
        return frame
          ? { url: `${SKIN_DIR}${skinId}.png`, x: frame.x + FACE.x, y: frame.y + FACE.y }
          : null;
      })
      .catch(() => null);
    skinFaces.set(skinId, face);
  }
  return face;
}

export class SocialUi {
  private readonly toggle = el('button', 'social-toggle');
  private readonly chat = el('section', 'social-panel chat-panel');
  private readonly log = el('ol', 'chat-panel__log');
  private readonly input = el('input', 'chat-panel__input');
  private readonly counter = el('div', 'chat-panel__count', chatCounter(''));
  private readonly emoji = el('section', 'social-panel emoji-panel');
  private readonly unsubscribes: (() => void)[] = [];
  private shownCount = 0;
  private sending = false;

  constructor(private readonly options: SocialUiOptions) {
    const { root, services } = options;

    this.toggle.type = 'button';
    this.toggle.setAttribute('aria-label', 'Trò chuyện');
    this.toggle.title = 'Trò chuyện (Enter)';
    this.toggle.append(el('span', 'social-toggle__icon'));
    this.toggle.addEventListener('click', () => void this.setChatOpen(this.chat.hidden));

    this.buildChat();
    this.buildEmoji();
    this.chat.hidden = true;
    this.emoji.hidden = true;
    root.append(this.toggle, this.chat, this.emoji);

    this.unsubscribes.push(
      services.store.select(
        (s) => s.lake.chat,
        (chat) => this.renderLog(chat),
      ),
    );
    this.renderLog(services.store.getState().lake.chat);
  }

  get isChatOpen(): boolean {
    return !this.chat.hidden;
  }

  /** Enter trong game: mở khung chat và đặt con trỏ vào ô nhập. */
  focusInput(): void {
    if (this.chat.hidden) void this.setChatOpen(true);
    this.input.focus();
  }

  destroy(): void {
    this.unsubscribes.forEach((unsubscribe) => unsubscribe());
    this.options.onTyping(false);
    this.toggle.remove();
    this.chat.remove();
    this.emoji.remove();
  }

  private buildChat(): void {
    const header = el('header', 'social-panel__header');
    header.append(
      el('h2', 'social-panel__title', 'Trò chuyện'),
      closeButton('Đóng trò chuyện', () => void this.setChatOpen(false)),
    );

    const form = el('form', 'chat-panel__form');
    this.input.type = 'text';
    this.input.placeholder = 'Nhập tin nhắn...';
    this.input.maxLength = CHAT_MAX_LENGTH;
    this.input.autocomplete = 'off';
    this.input.addEventListener('input', () => {
      this.counter.textContent = chatCounter(this.input.value);
    });
    this.input.addEventListener('focus', () => this.options.onTyping(true));
    this.input.addEventListener('blur', () => this.options.onTyping(false));
    this.input.addEventListener('keydown', (event) => {
      // Không cho phím lọt xuống game khi đang gõ; Esc đóng khung chat.
      event.stopPropagation();
      if (event.key === 'Escape') void this.setChatOpen(false);
    });

    const emojiButton = el('button', 'chat-panel__emoji');
    emojiButton.type = 'button';
    emojiButton.setAttribute('aria-label', 'Biểu cảm');
    emojiButton.addEventListener('click', () => void this.setEmojiOpen(this.emoji.hidden));

    const send = el('button', 'chat-panel__send');
    send.type = 'submit';
    send.setAttribute('aria-label', 'Gửi');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      void this.sendChat();
    });
    form.append(this.input, emojiButton, send);

    this.chat.append(header, this.log, form, this.counter);
    void loadEmoteFrames().then((frames) => {
      const icon = frames['smileyStatic'];
      if (icon) emojiButton.append(this.emoteIcon(icon));
    });
  }

  private buildEmoji(): void {
    const header = el('header', 'social-panel__header');
    header.append(
      el('h2', 'social-panel__title', 'Biểu cảm'),
      closeButton('Đóng biểu cảm', () => void this.setEmojiOpen(false)),
    );
    const grid = el('div', 'emoji-panel__grid');
    const slots = EMOJIS.map((emoji) => {
      const slot = el('button', 'emoji-panel__slot');
      slot.type = 'button';
      slot.dataset.emojiId = emoji.id;
      slot.setAttribute('aria-label', emoji.art);
      slot.addEventListener('click', () => void this.sendEmoji(emoji.id));
      grid.append(slot);
      return { slot, emoji };
    });
    this.emoji.append(header, grid);
    void loadEmoteFrames().then((frames) => {
      for (const { slot, emoji } of slots) {
        const frame = frames[`${emoji.art}Static`];
        if (frame) slot.append(this.emoteIcon(frame));
      }
    });
  }

  private emoteIcon(frame: FrameRect): HTMLElement {
    const icon = el('span', 'emote-icon');
    icon.style.backgroundImage = `url("${EMOTE_SHEET_URL}")`;
    icon.style.backgroundPosition = `-${frame.x}px -${frame.y}px`;
    icon.style.width = `${frame.w}px`;
    icon.style.height = `${frame.h}px`;
    return icon;
  }

  private async setChatOpen(open: boolean): Promise<void> {
    if (open === !this.chat.hidden) return;
    this.toggle.classList.toggle('social-toggle--active', open);
    if (open) {
      this.chat.hidden = false;
      animateIn(this.chat);
      this.log.scrollTop = this.log.scrollHeight;
      return;
    }
    this.input.blur();
    await Promise.all([animateOut(this.chat), this.setEmojiOpen(false)]);
    this.chat.hidden = true;
  }

  private async setEmojiOpen(open: boolean): Promise<void> {
    if (open === !this.emoji.hidden) return;
    if (open) {
      this.emoji.hidden = false;
      animateIn(this.emoji);
      return;
    }
    await animateOut(this.emoji);
    this.emoji.hidden = true;
  }

  private renderLog(chat: ChatMessage[]): void {
    // Store giữ tối đa 100 tin; dựng lại khi danh sách bị cắt đầu, còn lại chỉ thêm tin mới.
    if (chat.length < this.shownCount || this.log.childElementCount !== this.shownCount) {
      this.log.replaceChildren();
      this.shownCount = 0;
    }
    const atBottom = this.log.scrollHeight - this.log.scrollTop - this.log.clientHeight < 24;
    for (const message of chat.slice(this.shownCount)) this.log.append(this.messageItem(message));
    this.shownCount = chat.length;
    if (atBottom) this.log.scrollTop = this.log.scrollHeight;
  }

  private messageItem(message: ChatMessage): HTMLElement {
    const { lake, session } = this.options.services.store.getState();
    const player = lake.players[message.playerId];
    const mine = message.playerId === session.profile?.playerId;
    const name = message.displayName ?? player?.displayName ?? 'Người chơi';
    const skinId =
      player?.skinId ?? (mine ? session.profile?.selectedSkinId : undefined) ?? 'skin_01';

    const item = el('li', mine ? 'chat-msg chat-msg--mine' : 'chat-msg');
    const avatar = el('span', 'chat-msg__avatar');
    void faceOf(skinId).then((face) => {
      if (!face) return;
      avatar.style.backgroundImage = `url("${face.url}")`;
      avatar.style.backgroundPosition = `-${face.x}px -${face.y}px`;
    });
    const meta = el('div', 'chat-msg__meta');
    meta.append(
      el('span', 'chat-msg__name', name),
      el('span', 'chat-msg__time', formatChatTime(message.sentAt, Date.now())),
    );
    const body = el('div', 'chat-msg__body');
    body.append(meta, el('p', 'chat-msg__bubble', message.text));
    item.append(avatar, body);
    return item;
  }

  private async sendChat(): Promise<void> {
    const text = normalizeChat(this.input.value);
    if (!text || this.sending) return;
    this.sending = true;
    try {
      const ack = await this.options.services.hub.invoke('SendChat', { text });
      if (!ack.ok) {
        showError(this.options.root, ack.error);
        return;
      }
      this.input.value = '';
      this.counter.textContent = chatCounter('');
    } catch (error) {
      console.warn(error);
      showError(this.options.root, { code: 'NETWORK_ERROR' });
    } finally {
      this.sending = false;
    }
  }

  private async sendEmoji(emojiId: string): Promise<void> {
    try {
      const ack = await this.options.services.hub.invoke('SendEmoji', { emojiId });
      if (!ack.ok) showError(this.options.root, ack.error);
    } catch (error) {
      console.warn(error);
      showError(this.options.root, { code: 'NETWORK_ERROR' });
    }
  }
}
