// HUD vé câu cá và hộp thoại mua vé. Vé không gắn với ghế; giá và Gold luôn lấy theo Server.
import type { Services } from '../../core/services';
import {
  createButton,
  createGoldLabel,
  createPanel,
  showError,
  showToast,
} from '../../ui/kit/components';
import { formatGold } from '../../ui/kit/format';
import { MAX_UI_DURATION_UNITS, formatClock, priceSummary, sessionEndText } from './seatLogic';
import type { LakeSeat } from './walkable';

const line = (text: string): HTMLElement => {
  const el = document.createElement('div');
  el.textContent = text;
  return el;
};

export class SeatUi {
  private readonly hud = document.createElement('div');
  private readonly clock = document.createElement('div');
  private readonly goldLabel = createGoldLabel('0');
  private readonly sessionRow = document.createElement('div');
  private readonly leaveButton;
  private readonly unsubscribes: (() => void)[] = [];
  private leaving = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly services: Services,
    private readonly canLeave: () => boolean,
  ) {
    const { store } = services;
    this.hud.className = 'seat-hud';
    this.sessionRow.className = 'seat-hud__session';
    this.leaveButton = createButton({ label: 'Rời ghế', onClick: () => void this.leave() });
    this.sessionRow.append(
      this.clock,
      createButton({
        label: 'Mua thêm vé',
        variant: 'primary',
        onClick: () => void this.openBuyTicket(),
      }),
      this.leaveButton,
    );
    this.hud.append(this.goldLabel.el, this.sessionRow);
    root.append(this.hud);

    this.goldLabel.set(store.getState().session.gold ?? '0');
    this.unsubscribes.push(
      store.select(
        (s) => s.session.gold,
        (gold) => this.goldLabel.set(gold ?? '0'),
      ),
      store.select(
        (s) => s.lake.lastSeatEnd,
        (end) => {
          if (end) showToast(root, sessionEndText(end.reason));
        },
      ),
    );
  }

  update(serverNowMs: number): void {
    const seat = this.services.store.getState().lake.mySeat;
    this.sessionRow.hidden = seat === null;
    if (!seat) return;
    const ticket = this.services.store.getState().lake.myTicket;
    this.clock.textContent = ticket
      ? formatClock(Date.parse(ticket.expiresAt) - serverNowMs)
      : '--:--';
    this.leaveButton.disabled = !this.canLeave();
  }

  destroy(): void {
    this.unsubscribes.forEach((unsubscribe) => unsubscribe());
    this.hud.remove();
  }

  /** Bấm E / chọn ghế trống: còn vé thì ngồi luôn, hết vé thì mở hộp mua rồi ngồi. */
  async openSeat(seat: LakeSeat): Promise<void> {
    if (!this.hasValidTicket()) {
      const bought = await this.openBuyTicket();
      if (!bought) return;
    }
    await this.sitDown(seat);
  }

  private hasValidTicket(): boolean {
    const ticket = this.services.store.getState().lake.myTicket;
    return ticket !== null && Date.parse(ticket.expiresAt) > this.serverNow();
  }

  private serverNow(): number {
    return Date.now() + this.services.store.getState().lake.serverTimeOffsetMs;
  }

  private async sitDown(seat: LakeSeat): Promise<void> {
    try {
      const ack = await this.services.hub.invoke('SitDown', { seatId: seat.seatId });
      if (!ack.ok || !ack.data) {
        showError(this.root, ack.error);
        return;
      }
      this.services.store.dispatch({ type: 'MySeat', payload: ack.data.seat });
    } catch (error) {
      console.warn(error);
      showError(this.root, { code: 'NETWORK_ERROR' });
    }
  }

  /** true nếu đã mua vé thành công (hoặc đã sẵn vé), false nếu hủy/thất bại. */
  private openBuyTicket(): Promise<boolean> {
    const pricing = this.services.store.getState().catalog?.ticketPricing;
    if (!pricing) return Promise.resolve(false);

    return new Promise((resolve) => {
      let units = 1;
      const overlay = document.createElement('div');
      overlay.className = 'ui-dialog';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      let resolved = false;
      const close = (result: boolean) => {
        if (!resolved) {
          resolved = true;
          resolve(result);
        }
        overlay.remove();
      };

      const summary = document.createElement('div');
      summary.className = 'seat-dialog__total';
      const stepperValue = document.createElement('span');
      const pay = createButton({ label: 'Thanh toán', variant: 'primary' });
      const minus = createButton({ label: '−' });
      const plus = createButton({ label: '+' });
      const maxUnits = Math.min(MAX_UI_DURATION_UNITS, pricing.maxUnitsPerPurchase);

      const render = () => {
        const { minutes, total } = priceSummary(pricing, units);
        stepperValue.textContent = `${minutes} phút`;
        summary.textContent = `Tổng: ${formatGold(total)} Gold`;
        minus.disabled = units <= 1;
        plus.disabled = units >= maxUnits;
      };
      minus.addEventListener('click', () => {
        units -= 1;
        render();
      });
      plus.addEventListener('click', () => {
        units += 1;
        render();
      });
      pay.addEventListener('click', () => {
        pay.disabled = true;
        void this.submitBuyTicket(units, pricing.priceVersion)
          .then((ok) => close(ok))
          .catch(() => close(false));
      });

      const stepper = document.createElement('div');
      stepper.className = 'seat-dialog__stepper';
      stepper.append(minus, stepperValue, plus);

      const actions = document.createElement('div');
      actions.className = 'ui-dialog__actions';
      actions.append(createButton({ label: 'Đóng', onClick: () => close(false) }), pay);

      const body = document.createElement('div');
      body.append(
        line(
          `Đơn giá: ${formatGold(pricing.unitPriceGold)} Gold / ${pricing.billingUnitMinutes} phút`,
        ),
        stepper,
        summary,
        actions,
      );
      overlay.append(createPanel('Mua vé câu cá', body));
      this.root.append(overlay);
      render();
    });
  }

  private async submitBuyTicket(units: number, expectedPriceVersion: string): Promise<boolean> {
    try {
      const ack = await this.services.hub.invoke('BuyTicket', {
        quantity: units,
        expectedPriceVersion,
      });
      if (!ack.ok || !ack.data) {
        showError(this.root, ack.error);
        return false;
      }
      this.services.store.dispatch({ type: 'MyTicket', payload: ack.data.ticket });
      this.services.store.dispatch({ type: 'session/gold', payload: ack.data.gold });
      return true;
    } catch (error) {
      console.warn(error);
      showError(this.root, { code: 'NETWORK_ERROR' });
      return false;
    }
  }

  /** Rời ghế không mất vé nên không cần hỏi lại (SPEC 0.9); gọi lặp khi đang gửi thì bỏ qua. */
  async leave(): Promise<void> {
    if (this.leaving) return;
    this.leaving = true;
    try {
      const ack = await this.services.hub.invoke('LeaveSeat', {});
      if (!ack.ok) showError(this.root, ack.error);
    } catch (error) {
      console.warn(error);
      showError(this.root, { code: 'NETWORK_ERROR' });
    } finally {
      this.leaving = false;
    }
  }
}
