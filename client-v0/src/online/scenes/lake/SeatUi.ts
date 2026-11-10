// HUD phiên ghế và hộp thoại mua/gia hạn. Giá và Gold luôn lấy theo Server.
import type { Services } from '../../core/services';
import type { CommandAck, SeatPurchaseResult, SeatView } from '../../net/contract';
import {
  confirmDialog,
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

interface PurchaseOptions {
  title: string;
  confirmLabel: string;
  details: string[];
  seat: SeatView;
  submit: (units: number) => Promise<CommandAck<SeatPurchaseResult>>;
}

export class SeatUi {
  private readonly hud = document.createElement('div');
  private readonly clock = document.createElement('div');
  private readonly goldLabel = createGoldLabel('0');
  private readonly sessionRow = document.createElement('div');
  private readonly leaveButton;
  private readonly unsubscribes: (() => void)[] = [];

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
        label: 'Gia hạn',
        variant: 'primary',
        onClick: () => this.openExtend(),
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
        (s) => s.lake.lastSessionEnd,
        (end) => {
          if (end) showToast(root, sessionEndText(end.reason));
        },
      ),
    );
  }

  update(serverNowMs: number): void {
    const session = this.services.store.getState().lake.mySession;
    this.sessionRow.hidden = session === null;
    if (!session) return;
    this.clock.textContent = formatClock(Date.parse(session.expiresAt) - serverNowMs);
    this.leaveButton.disabled = !this.canLeave();
  }

  destroy(): void {
    this.unsubscribes.forEach((unsubscribe) => unsubscribe());
    this.hud.remove();
  }

  openBuy(seat: LakeSeat): void {
    const view = this.services.store.getState().lake.seats[seat.seatId];
    if (!view) return;
    this.openPurchase({
      title: `Ghế ${seat.number} · Tier ${view.tier}`,
      confirmLabel: 'Thanh toán',
      details: this.buffLines(view.tier),
      seat: view,
      submit: (durationUnits) =>
        this.services.hub.invoke('BuySeatTicket', {
          seatId: view.seatId,
          durationUnits,
          expectedPriceVersion: view.priceVersion,
        }),
    });
  }

  private openExtend(): void {
    const { lake } = this.services.store.getState();
    const session = lake.mySession;
    const view = session ? lake.seats[session.seatId] : undefined;
    if (!session || !view) return;
    this.openPurchase({
      title: 'Gia hạn ghế',
      confirmLabel: 'Gia hạn',
      details: [],
      seat: view,
      submit: (durationUnits) =>
        this.services.hub.invoke('ExtendSeatSession', {
          sessionId: session.sessionId,
          durationUnits,
          expectedPriceVersion: view.priceVersion,
        }),
    });
  }

  private buffLines(tier: number): string[] {
    const config = this.services.store.getState().catalog?.seatTiers.find((t) => t.tier === tier);
    if (!config) return [];
    return [
      `Rare Luck +${config.rareLuck} · Large Luck +${config.largeLuck}`,
      `Giảm thời gian chờ: ${config.lureTimeMs / 1000} giây`,
    ];
  }

  private openPurchase(options: PurchaseOptions): void {
    const { seat } = options;
    let units = 1;
    const overlay = document.createElement('div');
    overlay.className = 'ui-dialog';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const summary = document.createElement('div');
    summary.className = 'seat-dialog__total';
    const stepperValue = document.createElement('span');
    const pay = createButton({ label: options.confirmLabel, variant: 'primary' });
    const minus = createButton({ label: '−' });
    const plus = createButton({ label: '+' });

    const render = () => {
      const { minutes, total } = priceSummary(seat, units);
      stepperValue.textContent = `${minutes} phút`;
      summary.textContent = `Tổng: ${formatGold(total)} Gold`;
      minus.disabled = units <= 1;
      plus.disabled = units >= MAX_UI_DURATION_UNITS;
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
      void this.submit(options, units).finally(() => overlay.remove());
    });

    const stepper = document.createElement('div');
    stepper.className = 'seat-dialog__stepper';
    stepper.append(minus, stepperValue, plus);

    const actions = document.createElement('div');
    actions.className = 'ui-dialog__actions';
    actions.append(createButton({ label: 'Đóng', onClick: () => overlay.remove() }), pay);

    const body = document.createElement('div');
    body.append(
      ...options.details.map(line),
      line(`Đơn giá: ${formatGold(seat.unitPriceGold)} Gold / ${seat.billingUnitMinutes} phút`),
      stepper,
      summary,
      actions,
    );
    overlay.append(createPanel(options.title, body));
    this.root.append(overlay);
    render();
  }

  private async submit(options: PurchaseOptions, units: number): Promise<void> {
    try {
      const ack = await options.submit(units);
      if (!ack.ok || !ack.data) {
        showError(this.root, ack.error);
        return;
      }
      this.services.store.dispatch({ type: 'session/gold', payload: ack.data.gold });
    } catch (error) {
      console.warn(error);
      showError(this.root, { code: 'NETWORK_ERROR' });
    }
  }

  async leave(): Promise<void> {
    const yes = await confirmDialog(this.root, {
      title: 'Rời ghế',
      message: 'Không hoàn vé. Bạn có chắc muốn rời ghế?',
      confirmLabel: 'Rời ghế',
    });
    if (!yes) return;
    const ack = await this.services.hub.invoke('LeaveSeat', {});
    if (!ack.ok) showError(this.root, ack.error);
  }
}
