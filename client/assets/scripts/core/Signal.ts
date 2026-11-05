/**
 * Mot su kien co kieu ro rang.
 *
 * Dung mot Signal cho moi su kien thay vi mot event bus tra cuu bang chuoi,
 * vi nhu vay TypeScript kiem tra duoc kieu payload ngay luc bien dich, va doc
 * khai bao cua `IGameClient` la biet het su kien ma server co the gui ve.
 *
 * Khong import `cc` o day. Toan bo tang core, net, state, iso va fishing deu
 * khong phu thuoc engine, nho vay chay va kiem thu duoc bang Node thuan.
 */
export type SignalHandler<T> = (payload: T) => void;

export class Signal<T = void> {
    private handlers: SignalHandler<T>[] = [];
    private onceHandlers = new Set<SignalHandler<T>>();

    /** Dang ky lang nghe. Tra ve ham huy dang ky. */
    public on(handler: SignalHandler<T>): () => void {
        this.handlers.push(handler);
        return () => this.off(handler);
    }

    /** Lang nghe dung mot lan roi tu huy. */
    public once(handler: SignalHandler<T>): () => void {
        this.onceHandlers.add(handler);
        return this.on(handler);
    }

    public off(handler: SignalHandler<T>): void {
        const i = this.handlers.indexOf(handler);
        if (i >= 0) this.handlers.splice(i, 1);
        this.onceHandlers.delete(handler);
    }

    public clear(): void {
        this.handlers.length = 0;
        this.onceHandlers.clear();
    }

    public get count(): number {
        return this.handlers.length;
    }

    /**
     * Goi tat ca handler.
     *
     * Duyet tren ban sao vi handler co the tu huy dang ky hoac dang ky them
     * ngay trong luc dang goi. Mot handler nem loi khong duoc lam chet cac
     * handler con lai, nen loi duoc bat va bao lai qua `onError`.
     */
    public emit(payload: T): void {
        const snapshot = this.handlers.slice();
        for (const handler of snapshot) {
            if (this.onceHandlers.has(handler)) {
                this.off(handler);
            }
            try {
                handler(payload);
            } catch (e) {
                Signal.onError(e, payload);
            }
        }
    }

    /** Cho phep tang tren thay the cach bao loi, mac dinh ghi ra console. */
    public static onError: (error: unknown, payload: unknown) => void = (error) => {
        console.error('[Signal] handler loi:', error);
    };
}
