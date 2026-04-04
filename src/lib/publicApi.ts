type ApiBody<T> = {
  item?: T | T[];
  totalCount?: number;
  numOfRows?: number;
  pageNo?: number;
};

type ApiResponse<T> = {
  header?: { resultCode?: string; resultMsg?: string };
  body?: ApiBody<T>;
};

export function toArray<T>(val: T | T[] | undefined | null): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

export async function fetchPublicApi<T>(
  baseUrl: string,
  endpoint: string,
  params: Record<string, string>,
): Promise<T[]> {
  const serviceKey = process.env.OPEN_API_KEY ?? '';
  const searchParams = new URLSearchParams({
    serviceKey,
    type: 'JSON',
    pageNo: '1',
    numOfRows: params._numOfRows ?? '100',
    ...params,
  });
  searchParams.delete('_numOfRows');

  const url = `${baseUrl}${endpoint}?${searchParams.toString()}`;
  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    throw new Error(`Public API HTTP error: ${res.status} ${endpoint}`);
  }

  const json: ApiResponse<T> = await res.json();
  const resultCode = json?.header?.resultCode;
  if (resultCode && resultCode !== 'K0' && resultCode !== '00') {
    // K3 = NODATA_ERROR → 데이터 없음 (에러 아님)
    if (resultCode === 'K3') return [];
    throw new Error(`Public API error: ${resultCode} - ${json?.header?.resultMsg} [${endpoint}]`);
  }

  return toArray(json?.body?.item) as T[];
}
