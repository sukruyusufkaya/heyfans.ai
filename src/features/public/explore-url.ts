/** Keşfet filtre durumu ve URL üretimi (sunucu + istemci paylaşır; "use client" DEĞİL). */
export interface FilterValues {
  q: string;
  categories: string[];
  price: string;
  online: boolean;
  verified: boolean;
  sort: string;
}

export function exploreHref(v: FilterValues, page?: number) {
  const p = new URLSearchParams();
  if (v.q) p.set("q", v.q);
  for (const c of v.categories) p.append("c", c);
  if (v.price !== "all") p.set("price", v.price);
  if (v.online) p.set("online", "1");
  if (v.verified) p.set("verified", "1");
  if (v.sort !== "popular") p.set("sort", v.sort);
  if (page && page > 1) p.set("page", String(page));
  const qs = p.toString();
  return qs ? `/explore?${qs}` : "/explore";
}
