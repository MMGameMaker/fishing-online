// Khung "Trò chuyện" và bảng "Biểu cảm" theo ảnh demo 2026-11-13 (art trong public/new resources/ui),
// vẽ bằng DOM trên canvas. Tin của mình nằm bên phải, không tên; tin người khác có mặt thỏ theo skin.
// Tin nhắn lấy từ store (ChatReceived của Server); gửi qua SendChat/SendEmoji, Server kiểm tra lại
// độ dài, tần suất và danh sách emoji. Hiện/ẩn mọi khung qua ui/kit/motion.ts.
import { UI_DESIGN_HEIGHT, UI_DESIGN_WIDTH } from '../core/env';
import type { Services } from '../core/services';
import type { ChatEntry } from '../state/store';
import { showError } from '../ui/kit/components';
import { animateIn, animateOut } from '../ui/kit/motion';
import { CHAT_MAX_LENGTH, chatCounter, formatChatTime, normalizeChat } from './chatFormat';
import { renderAnnouncement } from '../ui/announce/CatchBanner';
import {
  EMOJIS,
  EMOTE_SHEET_URL,
  emojiById,
  loadEmoteFrames,
  loadTrimmedEmoteFrames,
  type FrameRect,
} from './emojis';

const CLOSE_ICON = encodeURI('/mini game/Button Close.png');
const UI = (file: string) => encodeURI(`/new resources/ui/${file}`);
/** Khung chat vẽ cho màn 1080p (pixel ảnh); thu cả khung theo cửa sổ, chừa chỗ cho nút mở bên dưới. */
const PANEL_W = 492;
const PANEL_H = 952;
const MIN_PANEL_H = 560;
const RESERVED_BOTTOM_PX = 128;
/** Chừa dải trên cho khung người chơi/vé của HomeHud để khung chat không đè lên. */
const RESERVED_TOP_PX = 104;
const SKIN_DIR = '/assets/characters/';
/** Vùng mặt thỏ trong frame idle_down_0 (khung bake 120×140, chân ở 60,76). */
const FACE = { x: 44, y: 34, size: 34 };

type ChatMessage = ChatEntry;
/** Số tin chưa xem hiện tối đa, quá thì ghi "99+". */
const UNREAD_MAX = 99;

export interface SocialUiOptions {
  root: HTMLElement;
  services: Services;
  /** Đang gõ chữ: scene tắt phím di chuyển để WASD/F không điều khiển nhân vật. */
  onTyping: (typing: boolean) => void;
  /** Cắt sát khung emoji để icon nằm giữa ô (pier.html, feedback 2026-11-14). */
  trimEmotes?: boolean;
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
  private readonly badge = el('span', 'social-toggle__badge');
  private shownCount = 0;
  private unread = 0;
  private sending = false;

  constructor(private readonly options: SocialUiOptions) {
    const { root, services } = options;

    this.toggle.type = 'button';
    this.toggle.setAttribute('aria-label', 'Trò chuyện');
    this.toggle.title = 'Trò chuyện (Enter)';
    const toggleIcon = el('img', '');
    toggleIcon.src = UI('Chat Button.png');
    toggleIcon.alt = '';
    this.toggle.append(toggleIcon, this.badge);
    this.badge.hidden = true;
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
    // Tin có sẵn lúc vào hồ không tính là chưa xem.
    this.setUnread(0);

    this.fit();
  }

  /** Cỡ khung trong màn thiết kế 1920×1080 (ui-root scale cả khung chơi): thu 0,75 như màn 1080p. */
  private fit(): void {
    // Chừa đúng phần dưới theo vị trí thật của khung (trang có thể đặt khác qua CSS, vd. pier.html).
    const bottom = parseFloat(getComputedStyle(this.chat).bottom) || RESERVED_BOTTOM_PX - 16;
    const free = Math.max(200, UI_DESIGN_HEIGHT - bottom - 16 - RESERVED_TOP_PX);
    const scale = Math.max(0.35, Math.min(0.75, free / PANEL_H, (UI_DESIGN_WIDTH - 32) / PANEL_W));
    const height = Math.max(MIN_PANEL_H, Math.min(PANEL_H, free / scale));
    for (const panel of [this.chat, this.emoji]) {
      panel.style.setProperty('--chat-scale', String(scale));
      panel.style.setProperty('--chat-h', `${Math.round(height)}px`);
    }
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
    emojiButton.append(this.image(UI('Button Emote.png')));
    emojiButton.addEventListener('click', () => void this.setEmojiOpen(this.emoji.hidden));

    const send = el('button', 'chat-panel__send');
    send.type = 'submit';
    send.setAttribute('aria-label', 'Gửi');
    send.append(this.image(UI('Button Send.png')));
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      void this.sendChat();
    });
    form.append(this.input, emojiButton, send);

    this.chat.append(header, this.log, form, this.counter);
  }

  private image(src: string): HTMLImageElement {
    const node = el('img', '');
    node.src = src;
    node.alt = '';
    node.draggable = false;
    return node;
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
    void this.emoteFrames().then((frames) => {
      for (const { slot, emoji } of slots) {
        const frame = frames[`${emoji.art}Static`];
        if (frame) slot.append(this.emoteIcon(frame));
      }
    });
  }

  private emoteFrames(): Promise<Record<string, FrameRect>> {
    return this.options.trimEmotes ? loadTrimmedEmoteFrames() : loadEmoteFrames();
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
      this.setUnread(0);
      this.chat.hidden = false;
      this.fit();
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
    const fresh = chat.slice(this.shownCount);
    for (const message of fresh) this.log.append(this.messageItem(message));
    this.shownCount = chat.length;
    // Khung chat đang đóng: đếm tin mới của người khác để hiện số trên nút chat.
    if (this.chat.hidden) {
      const myId = this.options.services.store.getState().session.profile?.playerId;
      const others = fresh.filter((message) => message.playerId !== myId).length;
      if (others > 0) this.setUnread(this.unread + others);
    }
    if (atBottom) this.log.scrollTop = this.log.scrollHeight;
  }

  private messageItem(message: ChatMessage): HTMLElement {
    const { lake, session } = this.options.services.store.getState();
    const player = lake.players[message.playerId];
    const mine = message.playerId === session.profile?.playerId;
    const name = message.displayName ?? player?.displayName ?? 'Người chơi';
    const skinId =
      player?.skinId ?? (mine ? session.profile?.selectedSkinId : undefined) ?? 'skin_01';

    if (message.announce) {
      // Tin hệ thống khoe cá (System Message.png): "[Hệ thống] giờ" + câu chúc mừng có màu.
      const item = el('li', 'chat-msg chat-msg--system');
      const tag = el('span', 'chat-msg__time');
      tag.append(
        el('span', 'chat-msg__announce-tag', '[Hệ thống] '),
        el('span', '', formatChatTime(message.sentAt, Date.now())),
      );
      const text = el('div', 'chat-msg__system-text');
      renderAnnouncement(text, message.announce, true);
      item.append(tag, text);
      return item;
    }
    if (mine) {
      // Tin của mình: chỉ bong bóng đuôi phải, nằm bên phải.
      const item = el('li', 'chat-msg chat-msg--mine');
      const body = el('div', 'chat-msg__body');
      body.title = formatChatTime(message.sentAt, Date.now());
      body.append(this.bubble(message, true));
      item.append(body);
      return item;
    }

    const item = el('li', 'chat-msg');
    const avatar = el('span', 'chat-msg__avatar');
    const face = el('span', 'chat-msg__face');
    avatar.append(face);
    void faceOf(skinId).then((rect) => {
      if (!rect) return;
      face.style.backgroundImage = `url("${rect.url}")`;
      face.style.backgroundPosition = `-${rect.x}px -${rect.y}px`;
    });
    const meta = el('div', 'chat-msg__meta');
    meta.append(
      el('span', 'chat-msg__name', name),
      el('span', 'chat-msg__time', formatChatTime(message.sentAt, Date.now())),
    );
    const body = el('div', 'chat-msg__body');
    body.append(meta, this.bubble(message));
    item.append(avatar, body);
    return item;
  }

  /** Bong bóng chữ, hoặc bong bóng chứa icon emoji khi người chơi gửi biểu cảm. */
  private bubble(message: ChatMessage, mine = false): HTMLElement {
    const base = mine ? 'chat-msg__bubble chat-msg__bubble--mine' : 'chat-msg__bubble';
    const emoji = message.emojiId ? emojiById(message.emojiId) : undefined;
    if (!message.emojiId) return el('p', base, message.text);
    const bubble = el('p', `${base} chat-msg__bubble--emoji`);
    bubble.setAttribute('aria-label', emoji?.art ?? message.emojiId);
    void this.emoteFrames().then((frames) => {
      const frame = emoji ? frames[`${emoji.art}Static`] : undefined;
      if (frame) bubble.append(this.emoteIcon(frame));
      else bubble.textContent = message.emojiId ?? '';
    });
    return bubble;
  }

  /** Số tin chưa xem dưới nút chat; hiện/ẩn có hiệu ứng qua motion.ts. */
  private setUnread(count: number): void {
    const was = this.unread;
    this.unread = count;
    this.badge.textContent = count > UNREAD_MAX ? `${UNREAD_MAX}+` : String(count);
    if (count > 0 && was === 0) {
      this.badge.hidden = false;
      animateIn(this.badge, 'pop');
    } else if (count === 0 && was > 0) {
      void animateOut(this.badge, 'pop').then(() => {
        if (this.unread === 0) this.badge.hidden = true;
      });
    } else if (count === 0) {
      this.badge.hidden = true;
    }
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
