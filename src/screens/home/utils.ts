export function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim() || "there";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export function parseAmount(raw: string | null | undefined): number {
  if (raw == null || raw === "") return NaN;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

export function formatMoney(amount: number, currency: string | null): string {
  const code = currency && currency.length === 3 ? currency : "USD";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: code, maximumFractionDigits: 2 }).format(
      amount,
    );
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

export function formatInt(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

function decodeBase64Url(input: string): string {
  const base = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base + "=".repeat((4 - (base.length % 4)) % 4);
  if (typeof globalThis.atob === "function") {
    return globalThis.atob(padded);
  }
  return "";
}

export function avatarFromAccessToken(token: string | null, email: string): string {
  if (token) {
    try {
      const payloadRaw = token.split(".")[1];
      if (payloadRaw) {
        const payload = JSON.parse(decodeBase64Url(payloadRaw)) as {
          user_metadata?: { picture?: string; avatar_url?: string };
        };
        const pic = payload.user_metadata?.picture ?? payload.user_metadata?.avatar_url;
        if (pic && typeof pic === "string") {
          return pic;
        }
      }
    } catch {
      // ignore
    }
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayNameFromEmail(email))}&background=5b21b6&color=ffffff&size=128`;
}
