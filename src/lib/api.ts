export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function messageFromBody(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const value = (data as { error: unknown }).error;
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

/** Parse a fetch Response as JSON. HTML/empty/non-JSON become a Korean error. */
export async function readApiJson<T>(res: Response): Promise<T> {
  const ctype = (res.headers.get("content-type") ?? "").toLowerCase();
  const text = await res.text();
  const trimmed = text.trim();

  if (!trimmed) {
    throw new ApiError(res.ok ? "서버가 빈 답을 보냈어" : `서버 오류 (${res.status})`, res.status);
  }

  const looksHtml =
    ctype.includes("text/html") ||
    trimmed.startsWith("<") ||
    trimmed.startsWith("<!") ||
    /<!doctype\s+html/i.test(trimmed);

  if (looksHtml) {
    throw new ApiError(
      res.status === 404
        ? "주소를 못 찾았어. 로비에서 방을 다시 만들어."
        : "서버가 페이지를 보냈어. 연결이 끊겼거나 방이 사라졌어. 로비에서 다시 만들어.",
      res.status,
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    throw new ApiError("서버 답이 깨졌어. 잠시 후 다시 시도해.", res.status);
  }

  if (!res.ok) {
    throw new ApiError(messageFromBody(data, `요청 실패 (${res.status})`), res.status);
  }

  return data as T;
}

function canRetry(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.status > 0 && error.status < 500 && error.status !== 404) return false;
  return /페이지|깨졌어|빈 답|서버 오류/.test(error.message);
}

export async function apiFetch<T>(input: string, init?: RequestInit, retries = 2): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(input, {
        cache: "no-store",
        ...init,
        headers: {
          Accept: "application/json",
          ...(init?.headers ?? {}),
        },
      });
      return await readApiJson<T>(res);
    } catch (error) {
      last = error;
      if (!canRetry(error) || attempt === retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 280 * (attempt + 1)));
    }
  }
  throw last instanceof Error ? last : new ApiError("요청 실패");
}
