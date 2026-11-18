// Khung "Trò chuyện" và bảng "Biểu cảm" theo ảnh demo 2026-11-13 (art trong public/new resources/ui),
// vẽ bằng DOM trên canvas. Tin của mình nằm bên phải, không tên; tin người khác có mặt thỏ theo skin.
// Tin nhắn lấy từ store (ChatReceived của Server); gửi qua SendChat/SendEmoji, Server kiểm tra lại
// độ dài, tần suất và danh sách emoji. Hiện/ẩn mọi khung qua ui/kit/motion.ts.
// BOT-02 (2026-11-18): hai tab "Thế giới" / "Tin riêng" (hội thoại theo người, số tin chưa xem; chỉ nhắn được cho bạn
// bè), và ô icon cá (loài đã câu được) sau 16 emoji trong bảng Biểu cảm.
import { UI_DESIGN_HEIGHT, UI_DESIGN_WIDTH } from '../core/env';
import type { Services } from '../core/services';
import type {
  CodexResponse,
  Conversation,
  ConversationsResponse,
  DirectMessage,
  DirectMessagesResponse,
  FriendsResponse,
} from '../net/contract';
import type { ChatEntry } from '../state/store';
import { fishImage } from '../ui/fishArt';
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
import { fishEmojiId, fishEmojiSlots, fishSpeciesOf } from './fishEmoji';
import { faceElement } from './skinFace';
import { conversationRows, totalUnread, type ConversationRow } from './directModel';

const CLOSE_ICON = encodeURI('/mini game/Button Close.png');
const UI = (file: string) => encodeURI(`/new resources/ui/${file}`);
/** Khung chat vẽ cho màn 1080p (pixel ảnh); thu cả khung theo cửa sổ, chừa chỗ cho nút mở bên dưới. */
const PANEL_W = 492;
const PANEL_H = 952;
const MIN_PANEL_H = 560;
const RESERVED_BOTTOM_PX = 128;
/** Chừa dải trên cho khung người chơi/vé của HomeHud để khung chat không đè lên. */
const RESERVED_TOP_PX = 104;

type ChatMessage = ChatEntry;
type Tab = 'world' | 'direct';
/** Số tin chưa xem hiện tối đa, quá thì ghi "99+". */
const UNREAD_MAX = 99;

export interface SocialUiOptions {
  root: HTMLElement;
  services: Services;
  /** Đang gõ chữ: scene tắt phím di chuyển để WASD/F không điều khiển nhân vật. */
  onTyping: (typing: boolean) => void;
  /** Cắt sát khung emoji để icon nằm giữa ô (pier.html, feedback 2026-11-14). */
  trimEmotes?: boolean;
  /** Bấm avatar/tên trong tab Tin riêng: mở popup thông tin người đó. */
  onOpenPlayer?: (playerId: string) => void;
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

function unreadText(count: number): string {
  return count > UNREAD_MAX ? `${UNREAD_MAX}+` : String(count);
}

export class SocialUi {
  private readonly toggle = el('button', 'social-toggle');
  private readonly chat = el('section', 'social-panel chat-panel');
  private readonly log = el('ol', 'chat-panel__log');
  private readonly input = el('input', 'chat-panel__input');
  private readonly counter = el('div', 'chat-panel__count', chatCounter(''));
  private readonly emoji = el('section', 'social-panel emoji-panel');
  private readonly fishGrid = el('div', 'emoji-panel__grid emoji-panel__grid--fish');
  private readonly unsubscribes: (() => void)[] = [];
  private readonly badge = el('span', 'social-toggle__badge');
  private readonly tabWorld = el('button', 'chat-tabs__tab chat-tabs__tab--active', 'Thế giới');
  private readonly tabDirect = el('button', 'chat-tabs__tab', 'Tin riêng');
  private readonly tabDirectBadge = el('span', 'chat-tabs__badge');
  private readonly directView = el('div', 'chat-direct');
  private readonly directList = el('ol', 'chat-direct__list');
  private readonly threadHead = el('div', 'chat-direct__head');
  private readonly threadName = el('button', 'chat-direct__name');
  private readonly threadLog = el('ol', 'chat-panel__log chat-direct__log');
  private readonly form = el('form', 'chat-panel__form');
  private shownCount = 0;
  private unread = 0;
  private sending = false;
  private tab: Tab = 'world';
  /** Người đang mở hội thoại riêng; null khi đang xem danh sách. */
  private thread: string | null = null;
  private conversations: Conversation[] = [];
  private directLoaded = false;
  private emoteFramesPromise: Promise<Record<string, FrameRect>> | null = null;

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

    const { store } = services;
    this.unsubscribes.push(
      store.select(
        (s) => s.lake.chat,
        (chat) => this.renderLog(chat),
      ),
      store.select(
        (s) => s.social.caughtSpecies,
        () => this.renderFishSlots(),
      ),
      store.select(
        (s) => s.catalog,
        () => this.renderFishSlots(),
      ),
      store.select(
        (s) => s.social.dms,
        () => this.onDirectChanged(),
      ),
      store.select(
        (s) => s.social.dmUnread,
        () => this.renderBadges(),
      ),
      store.select(
        (s) => s.social.friends,
        () => this.renderDirect(),
      ),
      store.select(
        (s) => s.lake.players,
        () => {
          if (this.tab === 'direct' && !this.thread) this.renderDirect();
        },
      ),
    );
    this.renderLog(store.getState().lake.chat);
    // Tin có sẵn lúc vào hồ không tính là chưa xem.
    this.setUnread(0);
    void this.loadCaughtSpecies();

    this.fit();
  }

  /** Cỡ khung trong màn thiết kế 1920×1080 (ui-root scale cả khung chơi): thu 0,75 như màn 1080p. */
  private fit(): void {
    // Chừa đúng phần dưới theo vị trí thật của khung (trang có thể đặt khác qua CSS, vd. pier.html).
    const bottom = parseFloat(getComputedStyle(this.chat).bottom) || RESERVED_BOTTOM_PX - 16;
    const free = Math.max(200, UI_DESIGN_HEIGHT - bottom - 16 - RESERVED_TOP_PX);
    // Trang có thể phóng khung chat qua biến CSS --chat-zoom (pier.html: 1,2).
    const zoom = parseFloat(getComputedStyle(this.chat).getPropertyValue('--chat-zoom')) || 1;
    const scale = Math.max(
      0.35,
      Math.min(0.75 * zoom, free / PANEL_H, (UI_DESIGN_WIDTH - 32) / PANEL_W),
    );
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

  /** Mở tab Tin riêng với một người (nút "Nhắn tin" ở popup người chơi / danh sách bạn). */
  openDirect(playerId: string): void {
    if (this.chat.hidden) void this.setChatOpen(true);
    this.setTab('direct');
    this.openThread(playerId);
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

    const tabs = el('div', 'chat-tabs');
    tabs.setAttribute('role', 'tablist');
    for (const [button, tab] of [
      [this.tabWorld, 'world'],
      [this.tabDirect, 'direct'],
    ] as const) {
      button.type = 'button';
      button.setAttribute('role', 'tab');
      button.addEventListener('click', () => this.setTab(tab));
      tabs.append(button);
    }
    this.tabDirect.append(this.tabDirectBadge);
    this.tabDirectBadge.hidden = true;

    // Tab Tin riêng: danh sách hội thoại, bấm vào một người thì mở hội thoại (có nút quay lại).
    const back = el('button', 'chat-direct__back', '‹');
    back.type = 'button';
    back.setAttribute('aria-label', 'Quay lại danh sách');
    back.addEventListener('click', () => this.closeThread());
    this.threadName.type = 'button';
    this.threadName.addEventListener('click', () => {
      if (this.thread) this.options.onOpenPlayer?.(this.thread);
    });
    this.threadHead.append(back, this.threadName);
    this.directView.append(this.directList, this.threadHead, this.threadLog);
    this.directView.hidden = true;

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
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      void (this.tab === 'direct' ? this.sendDirect() : this.sendChat());
    });
    this.form.append(this.input, emojiButton, send);

    this.chat.append(header, tabs, this.log, this.directView, this.form, this.counter);
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
    const body = el('div', 'emoji-panel__body');
    body.append(grid, this.fishGrid);
    this.emoji.append(header, body);
    void this.emoteFrames().then((frames) => {
      for (const { slot, emoji } of slots) {
        const frame = frames[`${emoji.art}Static`];
        if (frame) slot.append(this.emoteIcon(frame));
      }
    });
    this.renderFishSlots();
  }

  /** Loài đã câu (Sổ tay cá) để dựng ô icon cá; câu được loài mới thì store tự thêm (AttemptUpdate). */
  private async loadCaughtSpecies(): Promise<void> {
    if (this.options.services.store.getState().social.caughtSpecies) return;
    try {
      const codex = await this.options.services.api.get<CodexResponse>('/me/codex');
      this.options.services.store.dispatch({
        type: 'social/caught',
        payload: codex.species.filter((s) => s.discovered).map((s) => s.speciesId),
      });
    } catch (error) {
      console.warn('Không tải được Sổ tay cá cho icon cá', error);
    }
  }

  /** Ô icon cá sau 16 emoji, theo thứ tự loài trong catalog. */
  private renderFishSlots(): void {
    const { social, catalog } = this.options.services.store.getState();
    const order = catalog?.fish.map((f) => f.speciesId) ?? social.caughtSpecies ?? [];
    const species = fishEmojiSlots(social.caughtSpecies, order);
    this.fishGrid.hidden = species.length === 0;
    this.fishGrid.replaceChildren(
      ...species.map((speciesId) => {
        const slot = el('button', 'emoji-panel__slot emoji-panel__slot--fish');
        slot.type = 'button';
        slot.dataset.emojiId = fishEmojiId(speciesId);
        slot.setAttribute('aria-label', this.speciesName(speciesId));
        slot.title = this.speciesName(speciesId);
        slot.append(fishImage(speciesId, 'emoji-panel__fish'));
        slot.addEventListener('click', () => void this.sendEmoji(fishEmojiId(speciesId)));
        return slot;
      }),
    );
  }

  private speciesName(speciesId: string): string {
    return (
      this.options.services.store.getState().catalog?.fish.find((f) => f.speciesId === speciesId)
        ?.name ?? speciesId
    );
  }

  private emoteFrames(): Promise<Record<string, FrameRect>> {
    this.emoteFramesPromise ??= this.options.trimEmotes
      ? loadTrimmedEmoteFrames()
      : loadEmoteFrames();
    return this.emoteFramesPromise;
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
      if (this.tab === 'world') this.setUnread(0);
      else if (this.thread) this.markRead(this.thread);
      this.chat.hidden = false;
      this.fit();
      animateIn(this.chat);
      this.log.scrollTop = this.log.scrollHeight;
      this.threadLog.scrollTop = this.threadLog.scrollHeight;
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

  // ---------- Tab ----------

  private setTab(tab: Tab): void {
    if (tab === this.tab) return;
    this.tab = tab;
    this.tabWorld.classList.toggle('chat-tabs__tab--active', tab === 'world');
    this.tabDirect.classList.toggle('chat-tabs__tab--active', tab === 'direct');
    this.tabWorld.setAttribute('aria-selected', String(tab === 'world'));
    this.tabDirect.setAttribute('aria-selected', String(tab === 'direct'));
    this.log.hidden = tab !== 'world';
    this.directView.hidden = tab !== 'direct';
    if (tab === 'world') {
      this.setUnread(0);
      this.log.scrollTop = this.log.scrollHeight;
    } else {
      void this.loadDirect();
    }
    this.renderDirect();
    animateIn(tab === 'world' ? this.log : this.directView, 'fade');
  }

  // ---------- Thế giới ----------

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
    // Khung chat đang đóng (hoặc đang xem tab khác): đếm tin mới của người khác để hiện số trên nút chat.
    if (this.chat.hidden || this.tab !== 'world') {
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
    return this.bubbleItem({
      mine,
      name,
      skinId,
      sentAt: message.sentAt,
      bubble: this.bubble(message, mine),
      playerId: message.playerId,
    });
  }

  private bubbleItem(item: {
    mine: boolean;
    name: string;
    skinId: string;
    sentAt?: string;
    bubble: HTMLElement;
    playerId: string;
  }): HTMLElement {
    if (item.mine) {
      // Tin của mình: chỉ bong bóng đuôi phải, nằm bên phải.
      const li = el('li', 'chat-msg chat-msg--mine');
      const body = el('div', 'chat-msg__body');
      body.title = formatChatTime(item.sentAt, Date.now());
      body.append(item.bubble);
      li.append(body);
      return li;
    }
    const li = el('li', 'chat-msg');
    const avatar = el('span', 'chat-msg__avatar');
    avatar.append(faceElement(item.skinId, 'chat-msg__face'));
    const meta = el('div', 'chat-msg__meta');
    meta.append(
      el('span', 'chat-msg__name', item.name),
      el('span', 'chat-msg__time', formatChatTime(item.sentAt, Date.now())),
    );
    const body = el('div', 'chat-msg__body');
    body.append(meta, item.bubble);
    li.append(avatar, body);
    return li;
  }

  /** Bong bóng chữ, hoặc bong bóng chứa icon emoji/icon cá khi người chơi gửi biểu cảm. */
  private bubble(message: ChatMessage, mine = false): HTMLElement {
    const base = mine ? 'chat-msg__bubble chat-msg__bubble--mine' : 'chat-msg__bubble';
    if (!message.emojiId) return el('p', base, message.text);
    const bubble = el('p', `${base} chat-msg__bubble--emoji`);
    const fish = fishSpeciesOf(message.emojiId);
    if (fish) {
      bubble.setAttribute('aria-label', this.speciesName(fish));
      bubble.append(fishImage(fish, 'chat-msg__fish'));
      return bubble;
    }
    const emoji = emojiById(message.emojiId);
    bubble.setAttribute('aria-label', emoji?.art ?? message.emojiId);
    void this.emoteFrames().then((frames) => {
      const frame = emoji ? frames[`${emoji.art}Static`] : undefined;
      if (frame) bubble.append(this.emoteIcon(frame));
      else bubble.textContent = message.emojiId ?? '';
    });
    return bubble;
  }

  // ---------- Tin riêng ----------

  private async loadDirect(): Promise<void> {
    if (this.directLoaded) return;
    this.directLoaded = true;
    const { api, store } = this.options.services;
    try {
      const [conversations, friends] = await Promise.all([
        api.get<ConversationsResponse>('/me/dm'),
        store.getState().social.friends
          ? Promise.resolve(null)
          : api.get<FriendsResponse>('/friends'),
      ]);
      this.conversations = conversations.conversations;
      if (friends) store.dispatch({ type: 'social/friends', payload: friends });
      this.renderDirect();
    } catch (error) {
      this.directLoaded = false;
      showError(this.options.root, error);
    }
  }

  private rows(): ConversationRow[] {
    const { social, lake } = this.options.services.store.getState();
    return conversationRows({
      friends: social.friends ?? [],
      conversations: this.conversations,
      dms: social.dms,
      unread: social.dmUnread,
      inLake: (id) => Boolean(lake.players[id]),
    });
  }

  private renderDirect(): void {
    const inThread = this.thread !== null;
    this.directList.hidden = inThread;
    this.threadHead.hidden = !inThread;
    this.threadLog.hidden = !inThread;
    this.input.disabled = this.tab === 'direct' && !inThread;
    this.input.placeholder =
      this.tab === 'direct' && !inThread ? 'Chọn một người để nhắn...' : 'Nhập tin nhắn...';
    if (inThread) {
      this.renderThread();
      return;
    }
    const rows = this.rows();
    if (rows.length === 0) {
      this.directList.replaceChildren(
        el(
          'li',
          'chat-direct__empty',
          'Chưa có bạn bè. Bấm vào người chơi khác trên hồ để kết bạn rồi nhắn tin.',
        ),
      );
      return;
    }
    this.directList.replaceChildren(
      ...rows.map((row) => {
        const item = el('li', 'chat-direct__item');
        const button = el('button', 'chat-direct__open');
        button.type = 'button';
        const avatar = el('span', 'chat-msg__avatar');
        avatar.append(faceElement(row.skinId, 'chat-msg__face'));
        const info = el('span', 'chat-direct__info');
        const top = el('span', 'chat-direct__top');
        const dot = el('span', `chat-direct__dot${row.online ? ' chat-direct__dot--on' : ''}`);
        top.append(dot, el('span', 'chat-direct__who', row.displayName));
        info.append(top, el('span', 'chat-direct__last', row.lastText || 'Bắt đầu trò chuyện'));
        button.append(avatar, info);
        if (row.unread > 0) button.append(el('span', 'chat-tabs__badge', unreadText(row.unread)));
        button.addEventListener('click', () => this.openThread(row.playerId));
        item.append(button);
        return item;
      }),
    );
  }

  private openThread(playerId: string): void {
    this.thread = playerId;
    this.renderDirect();
    this.markRead(playerId);
    void this.loadThread(playerId);
  }

  private closeThread(): void {
    this.thread = null;
    this.renderDirect();
  }

  private async loadThread(playerId: string): Promise<void> {
    const { api, store } = this.options.services;
    try {
      const history = await api.get<DirectMessagesResponse>(`/me/dm/${playerId}`);
      store.dispatch({
        type: 'social/dmHistory',
        payload: { playerId, messages: history.messages },
      });
    } catch (error) {
      showError(this.options.root, error);
    }
  }

  private threadPeer(playerId: string): { name: string; skinId: string } {
    const { social, lake } = this.options.services.store.getState();
    const friend = social.friends?.find((f) => f.playerId === playerId);
    const conversation = this.conversations.find((c) => c.playerId === playerId);
    const inLake = lake.players[playerId];
    return {
      name: friend?.displayName ?? conversation?.displayName ?? inLake?.displayName ?? 'Người chơi',
      skinId: inLake?.skinId ?? friend?.skinId ?? conversation?.skinId ?? 'skin_01',
    };
  }

  private renderThread(): void {
    const playerId = this.thread;
    if (!playerId) return;
    const { social, session } = this.options.services.store.getState();
    const peer = this.threadPeer(playerId);
    this.threadName.textContent = peer.name;
    const atBottom =
      this.threadLog.scrollHeight - this.threadLog.scrollTop - this.threadLog.clientHeight < 24;
    const messages: DirectMessage[] = social.dms[playerId] ?? [];
    this.threadLog.replaceChildren(
      ...messages.map((message) => {
        const mine = message.fromPlayerId === session.profile?.playerId;
        return this.bubbleItem({
          mine,
          name: mine ? (session.profile?.displayName ?? '') : message.fromName,
          skinId: peer.skinId,
          sentAt: message.sentAt,
          bubble: el(
            'p',
            mine ? 'chat-msg__bubble chat-msg__bubble--mine' : 'chat-msg__bubble',
            message.text,
          ),
          playerId: message.fromPlayerId,
        });
      }),
    );
    if (atBottom || messages.length > 0) this.threadLog.scrollTop = this.threadLog.scrollHeight;
  }

  private onDirectChanged(): void {
    // Đang mở đúng hội thoại thì tin mới coi như đã xem.
    if (this.thread && this.tab === 'direct' && !this.chat.hidden) this.markRead(this.thread);
    this.renderDirect();
    this.renderBadges();
  }

  private markRead(playerId: string): void {
    if (this.options.services.store.getState().social.dmUnread[playerId]) {
      this.options.services.store.dispatch({ type: 'social/dmRead', payload: playerId });
    }
  }

  /** Số tin riêng chưa xem trên tab "Tin riêng" và cộng vào số trên nút chat. */
  private renderBadges(): void {
    const direct = totalUnread(this.options.services.store.getState().social.dmUnread);
    this.tabDirectBadge.textContent = unreadText(direct);
    this.tabDirectBadge.hidden = direct === 0;
    this.setUnread(this.unread);
  }

  /** Số tin chưa xem dưới nút chat (chat chung + tin riêng); hiện/ẩn có hiệu ứng qua motion.ts. */
  private setUnread(count: number): void {
    const before =
      this.unread + totalUnread(this.options.services.store.getState().social.dmUnread);
    this.unread = count;
    const shown = this.badgeCount();
    this.badge.textContent = unreadText(shown);
    if (shown > 0 && this.badge.hidden) {
      this.badge.hidden = false;
      animateIn(this.badge, 'pop');
    } else if (shown === 0 && !this.badge.hidden && before > 0) {
      void animateOut(this.badge, 'pop').then(() => {
        if (this.badgeCount() === 0) this.badge.hidden = true;
      });
    } else if (shown === 0) {
      this.badge.hidden = true;
    }
  }

  private badgeCount(): number {
    const direct = totalUnread(this.options.services.store.getState().social.dmUnread);
    return this.unread + (this.chat.hidden ? direct : 0);
  }

  // ---------- Gửi ----------

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
      this.clearInput();
    } catch (error) {
      console.warn(error);
      showError(this.options.root, { code: 'NETWORK_ERROR' });
    } finally {
      this.sending = false;
    }
  }

  private async sendDirect(): Promise<void> {
    const text = normalizeChat(this.input.value);
    const toPlayerId = this.thread;
    if (!text || !toPlayerId || this.sending) return;
    this.sending = true;
    try {
      const ack = await this.options.services.hub.invoke('SendDirectMessage', { toPlayerId, text });
      if (!ack.ok) {
        showError(this.options.root, ack.error);
        return;
      }
      // Event DirectMessageReceived cũng tới; ghép theo messageId nên không bị trùng.
      if (ack.data)
        this.options.services.store.dispatch({ type: 'DirectMessageReceived', payload: ack.data });
      this.clearInput();
    } catch (error) {
      console.warn(error);
      showError(this.options.root, { code: 'NETWORK_ERROR' });
    } finally {
      this.sending = false;
    }
  }

  private clearInput(): void {
    this.input.value = '';
    this.counter.textContent = chatCounter('');
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
