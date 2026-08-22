/* Atlas Isobar: asymmetric meteorological field sheet with readable data hierarchy and warm scientific texture. */
import { Button } from "@/components/ui/button";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Compass,
  Droplets,
  LocateFixed,
  Loader2,
  MapPin,
  Navigation,
  Search,
  Sun,
  Sunrise,
  Sunset,
  ThermometerSun,
  Wind,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Place = {
  id?: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  timezone?: string;
};

type Forecast = {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    precipitation: number;
    cloud_cover: number;
    is_day: number;
    time: string;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    sunrise: string[];
    sunset: string[];
  };
};

const DEFAULT_PLACE: Place = {
  name: "Jakarta",
  latitude: -6.2088,
  longitude: 106.8456,
  country: "Indonesia",
  admin1: "DKI Jakarta",
};

const QUICK_PLACES: Place[] = [
  DEFAULT_PLACE,
  { name: "Bandung", latitude: -6.9175, longitude: 107.6191, country: "Indonesia", admin1: "Jawa Barat" },
  { name: "Surabaya", latitude: -7.2575, longitude: 112.7521, country: "Indonesia", admin1: "Jawa Timur" },
  { name: "Denpasar", latitude: -8.65, longitude: 115.2167, country: "Indonesia", admin1: "Bali" },
];

const weatherMeta = (code: number) => {
  if (code === 0) return { label: "Cerah", Icon: Sun, tone: "sun" };
  if ([1, 2].includes(code)) return { label: "Cerah berawan", Icon: CloudSun, tone: "sun" };
  if (code === 3) return { label: "Berawan", Icon: Cloud, tone: "cloud" };
  if ([45, 48].includes(code)) return { label: "Berkabut", Icon: CloudFog, tone: "fog" };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: "Gerimis", Icon: CloudDrizzle, tone: "rain" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: "Hujan", Icon: CloudRain, tone: "rain" };
  if ([95, 96, 99].includes(code)) return { label: "Badai petir", Icon: CloudLightning, tone: "storm" };
  return { label: "Berawan", Icon: Cloud, tone: "cloud" };
};

const formatTime = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(value))
    : "—";

const formatDay = (value: string, index: number) => {
  if (index === 0) return "Hari ini";
  if (index === 1) return "Besok";
  return new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(new Date(`${value}T12:00:00`));
};

const getWindDirection = (degrees: number) => {
  const directions = ["U", "TL", "T", "TG", "S", "BD", "B", "BL"];
  return directions[Math.round(degrees / 45) % 8];
};

export default function Home() {
  const [place, setPlace] = useState<Place>(DEFAULT_PLACE);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

  const fetchForecast = async (target: Place) => {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        latitude: String(target.latitude),
        longitude: String(target.longitude),
        current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,is_day,precipitation,cloud_cover",
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
        timezone: "auto",
        forecast_days: "6",
      });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!response.ok) throw new Error("Data cuaca belum dapat diambil.");
      const data: Forecast = await response.json();
      setForecast(data);
      setPlace(target);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Terjadi gangguan saat mengambil data cuaca.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast(DEFAULT_PLACE);
  }, []);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setError("Masukkan minimal 2 karakter untuk mencari kota.");
      return;
    }

    setIsSearching(true);
    setError("");
    try {
      const params = new URLSearchParams({ name: trimmedQuery, count: "5", language: "id", format: "json" });
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
      if (!response.ok) throw new Error("Pencarian kota belum dapat dilakukan.");
      const data = await response.json();
      const results: Place[] = (data.results ?? []).map((item: Place) => item);
      setMatches(results);
      if (!results.length) setError("Kota tidak ditemukan. Coba sertakan provinsi atau negara.");
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Terjadi gangguan saat mencari kota.");
    } finally {
      setIsSearching(false);
    }
  };

  const choosePlace = (target: Place) => {
    setMatches([]);
    setQuery("");
    fetchForecast(target);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Perangkat ini belum mendukung lokasi otomatis.");
      return;
    }
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => fetchForecast({ name: "Lokasi Anda", latitude: position.coords.latitude, longitude: position.coords.longitude, country: "Posisi saat ini" }),
      () => {
        setIsLoading(false);
        setError("Izin lokasi tidak tersedia. Silakan cari kota secara manual.");
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  const currentMeta = useMemo(() => weatherMeta(forecast?.current.weather_code ?? 1), [forecast]);
  const CurrentIcon = currentMeta.Icon;
  const isDay = forecast?.current.is_day !== 0;
  const displayPlace = [place.name, place.admin1].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f5ed] text-[#17345c]">
      <header className="relative z-30 border-b border-[#ccd9e8]/80 bg-[#f7f5ed]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
          <a className="flex items-center gap-3" href="#utama" aria-label="CuacaKita beranda">
            <img src="/manus-storage/cuacakita-mark_66d5b412.png" alt="Simbol CuacaKita" className="h-11 w-11 rounded-[14px] shadow-[0_5px_14px_rgba(23,91,186,.16)]" />
            <div className="leading-none">
              <span className="block text-lg font-extrabold tracking-[-0.06em] text-[#175bba]">CuacaKita</span>
              <span className="mt-1 block text-[9px] font-extrabold uppercase tracking-[0.19em] text-[#6180a7]">Lembar observasi</span>
            </div>
          </a>
          <div className="hidden items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#567397] sm:flex">
            <span className="h-2 w-2 rounded-full bg-[#f5b544]" />
            Data prakiraan langsung
          </div>
        </div>
      </header>

      <main id="utama" className="relative mx-auto max-w-[1440px] px-5 pb-14 pt-6 sm:px-8 lg:px-12 lg:pt-9">
        <div className="pointer-events-none absolute -right-48 top-12 h-96 w-96 rounded-full bg-[#dceafa] blur-3xl" />
        <section className="relative z-10 grid gap-6 lg:grid-cols-[150px_minmax(0,1fr)] lg:gap-9">
          <aside className="flex items-center gap-4 border-b border-[#cdd9e7] pb-4 lg:flex-col lg:items-start lg:border-b-0 lg:border-r lg:pb-0 lg:pr-7">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#175bba] text-[#f6f4ec] shadow-[0_9px_20px_rgba(23,91,186,.24)]">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#6380a2]">Titik amatan</p>
              <p className="mt-1 font-editorial text-xl leading-tight text-[#1e3961]">Baca ritme langit.</p>
            </div>
            <div className="ml-auto hidden lg:ml-0 lg:mt-auto lg:block">
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#6380a2]">Diperbarui</span>
              <span className="mt-1 block text-sm font-extrabold text-[#23436e]">{forecast ? formatTime(forecast.current.time) : "—"}</span>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
              <div className="max-w-xl">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#175bba]">Cuaca, tanpa tebakan</p>
                <h1 className="mt-2 font-editorial text-4xl leading-[0.95] tracking-[-0.035em] text-[#1d385e] sm:text-5xl">Cari kota, lalu baca ritme harinya.</h1>
              </div>
              <form className="relative w-full max-w-[470px]" onSubmit={handleSearch}>
                <div className="flex rounded-2xl border border-[#c9d8e8] bg-[#fffdf6] p-1.5 shadow-[0_10px_24px_rgba(45,73,110,.08)] transition focus-within:border-[#175bba] focus-within:ring-4 focus-within:ring-[#175bba]/10">
                  <Search className="ml-3 h-5 w-5 self-center text-[#5e7eaa]" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cari Jakarta, Tokyo, atau Paris"
                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-semibold text-[#24436c] outline-none placeholder:text-[#91a5bc]"
                    aria-label="Cari kota"
                  />
                  <Button type="submit" size="sm" className="h-10 rounded-xl bg-[#175bba] px-4 font-bold text-white shadow-none hover:bg-[#124a99]" disabled={isSearching}>
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cari"}
                  </Button>
                </div>
                {matches.length > 0 && (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-2xl border border-[#c9d8e8] bg-[#fffdf6] p-1.5 shadow-xl">
                    {matches.map((match) => (
                      <button
                        type="button"
                        key={`${match.latitude}-${match.longitude}`}
                        onClick={() => choosePlace(match)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[#e7f0fb]"
                      >
                        <MapPin className="h-4 w-4 shrink-0 text-[#175bba]" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-extrabold text-[#24436c]">{match.name}</span>
                          <span className="block truncate text-xs text-[#6681a0]">{[match.admin1, match.country].filter(Boolean).join(", ")}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </form>
            </div>

            {error && <p className="mb-4 rounded-xl border border-[#efcfc5] bg-[#fff3ef] px-4 py-3 text-sm font-semibold text-[#9d4638]">{error}</p>}

            <section className="paper-grain relative overflow-hidden rounded-[28px] border border-[#c8d9ea] bg-[#e7f0fa] shadow-[0_20px_45px_rgba(31,72,123,.13)]">
              <img src="/manus-storage/cuacakita-hero-atlas_f5191a2a.jpg" alt="Ilustrasi atmosfer observatorium" className="absolute inset-0 h-full w-full object-cover object-right opacity-[0.88]" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(247,245,237,.94)_0%,rgba(247,245,237,.72)_42%,rgba(247,245,237,.18)_78%)]" />
              <svg className="drift-slow pointer-events-none absolute -right-12 top-4 h-[120%] w-[80%] text-white/70" viewBox="0 0 660 420" aria-hidden="true">
                <path className="isobar-line" d="M30 285C175 176 227 314 350 208S538 155 652 238" />
                <path className="isobar-line" d="M9 338C185 220 260 374 404 261s159-46 261-12" />
                <path className="isobar-line" d="M201 35C305 119 416 45 558 104s61 169 105 195" />
              </svg>
              <div className="relative grid min-h-[410px] gap-6 p-6 sm:p-9 lg:grid-cols-[minmax(0,1fr)_200px] lg:p-11">
                <div className="flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#4174b5]"><MapPin className="h-3.5 w-3.5" /> {displayPlace}</span>
                      <span className="h-1 w-1 rounded-full bg-[#f5b544]" />
                      <span className="text-[11px] font-bold text-[#6681a0]">{place.country || "Koordinat pilihan"}</span>
                    </div>
                    {isLoading || !forecast ? (
                      <div className="mt-10 flex items-center gap-3 text-[#24548e]"><Loader2 className="h-6 w-6 animate-spin" /> <span className="text-sm font-bold">Mengamati kondisi langit…</span></div>
                    ) : (
                      <>
                        <div className="mt-8 flex items-end gap-4">
                          <span className="font-editorial text-[118px] leading-[0.66] tracking-[-0.09em] text-[#163961] sm:text-[148px]">{Math.round(forecast.current.temperature_2m)}°</span>
                          <div className="mb-1.5 pb-1">
                            <p className="text-xl font-extrabold tracking-[-0.045em] text-[#1e4778]">{currentMeta.label}</p>
                            <p className="mt-1 text-sm font-semibold text-[#5d7898]">Terasa seperti {Math.round(forecast.current.apparent_temperature)}°</p>
                          </div>
                        </div>
                        <div className="mt-9 flex flex-wrap gap-2">
                          <span className="rounded-full border border-[#aac4df] bg-[#fffdf6]/65 px-3 py-1.5 text-[11px] font-bold text-[#315887]">Kelembapan {forecast.current.relative_humidity_2m}%</span>
                          <span className="rounded-full border border-[#aac4df] bg-[#fffdf6]/65 px-3 py-1.5 text-[11px] font-bold text-[#315887]">Awan {forecast.current.cloud_cover}%</span>
                          <span className="rounded-full border border-[#aac4df] bg-[#fffdf6]/65 px-3 py-1.5 text-[11px] font-bold text-[#315887]">Presipitasi {forecast.current.precipitation.toFixed(1)} mm</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="mt-10 flex items-center gap-3">
                    <Button onClick={useCurrentLocation} variant="outline" className="h-10 rounded-xl border-[#9cb9d7] bg-[#fffdf6]/75 px-4 text-xs font-extrabold text-[#175bba] shadow-none hover:bg-white hover:text-[#124a99]">
                      <LocateFixed className="mr-2 h-4 w-4" /> Gunakan lokasi saya
                    </Button>
                    <span className="text-xs font-medium text-[#547899]">Data diperbarui berkala</span>
                  </div>
                </div>
                <div className="relative flex min-h-44 flex-row gap-3 self-end lg:min-h-0 lg:flex-col lg:justify-end">
                  <div className="flex min-w-0 flex-1 flex-col justify-between rounded-2xl border border-white/70 bg-[#1b579f]/90 p-4 text-[#fefdf8] shadow-[0_14px_26px_rgba(17,69,134,.18)] backdrop-blur-sm">
                    <Wind className="h-6 w-6 text-[#f5c25a]" />
                    <div className="mt-8">
                      <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-white/65">Angin 10 m</span>
                      <span className="mt-1 block text-2xl font-extrabold tracking-[-0.06em]">{forecast ? Math.round(forecast.current.wind_speed_10m) : "—"}<small className="ml-1 text-xs tracking-normal text-white/70">km/j</small></span>
                      <span className="text-xs font-semibold text-white/70">dari {forecast ? getWindDirection(forecast.current.wind_direction_10m) : "—"}</span>
                    </div>
                  </div>
                  <div className="hidden overflow-hidden rounded-2xl border border-white/70 bg-[#fffdf6]/72 lg:block">
                    <img src={isDay ? "/manus-storage/cuacakita-sunbreak_6e04b55b.jpg" : "/manus-storage/cuacakita-monsoon_73805917.jpg"} alt="Ilustrasi kondisi langit" className="h-[126px] w-full object-cover" />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section className="relative z-10 mt-6 grid gap-5 lg:ml-[159px] lg:grid-cols-[minmax(0,1fr)_295px]">
          <div className="rounded-[24px] border border-[#d4dfeb] bg-[#fffdf8] p-5 shadow-[0_12px_32px_rgba(37,69,108,.06)] sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.19em] text-[#6180a4]">Prakiraan 6 hari</p>
                <h2 className="mt-1 font-editorial text-3xl tracking-[-0.035em] text-[#23436c]">Pergerakan berikutnya.</h2>
              </div>
              <span className="hidden text-[10px] font-bold uppercase tracking-[0.13em] text-[#7090b2] sm:block">maks / min</span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              {forecast?.daily.time.map((date, index) => {
                const meta = weatherMeta(forecast.daily.weather_code[index]);
                const Icon = meta.Icon;
                return (
                  <article key={date} className={`rounded-2xl border p-3.5 transition hover:-translate-y-0.5 ${index === 0 ? "border-[#175bba] bg-[#eaf3fd] shadow-[0_8px_18px_rgba(23,91,186,.1)]" : "border-[#dde6ee] bg-[#fdfcf7] hover:border-[#aac5de]"}`}>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#6280a2]">{formatDay(date, index)}</p>
                    <Icon className={`mt-5 h-7 w-7 ${meta.tone === "rain" || meta.tone === "storm" ? "text-[#2d72b9]" : "text-[#e9a82e]"}`} />
                    <p className="mt-4 truncate text-[11px] font-bold text-[#345679]">{meta.label}</p>
                    <p className="mt-1 text-base font-extrabold tracking-[-0.05em] text-[#1f426d]">{Math.round(forecast.daily.temperature_2m_max[index])}° <span className="text-[#88a0b8]">/ {Math.round(forecast.daily.temperature_2m_min[index])}°</span></p>
                    <p className="mt-3 flex items-center gap-1 text-[10px] font-bold text-[#5a80ab]"><Droplets className="h-3 w-3" /> {forecast.daily.precipitation_probability_max[index]}%</p>
                  </article>
                );
              }) || Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-40 animate-pulse rounded-2xl bg-[#edf1f3]" />)}
            </div>
          </div>

          <aside className="paper-grain overflow-hidden rounded-[24px] bg-[#1d518d] p-5 text-[#fffdf6] shadow-[0_15px_30px_rgba(22,67,122,.18)] sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.17em] text-[#a9c9ed]">Siklus cahaya</span>
              <Navigation className="h-4 w-4 text-[#f5bd4c]" />
            </div>
            <h2 className="mt-2 font-editorial text-3xl tracking-[-0.04em]">Pagi hingga sore.</h2>
            <div className="mt-7 h-px bg-white/20" />
            <div className="mt-5 grid grid-cols-2 gap-5">
              <div>
                <Sunrise className="h-5 w-5 text-[#f5bd4c]" />
                <span className="mt-3 block text-[10px] font-bold uppercase tracking-[0.15em] text-[#a9c9ed]">Terbit</span>
                <span className="mt-1 block text-xl font-extrabold tracking-[-0.05em]">{formatTime(forecast?.daily.sunrise[0])}</span>
              </div>
              <div>
                <Sunset className="h-5 w-5 text-[#f5bd4c]" />
                <span className="mt-3 block text-[10px] font-bold uppercase tracking-[0.15em] text-[#a9c9ed]">Terbenam</span>
                <span className="mt-1 block text-xl font-extrabold tracking-[-0.05em]">{formatTime(forecast?.daily.sunset[0])}</span>
              </div>
            </div>
            <p className="mt-8 border-t border-white/20 pt-4 text-xs font-medium leading-relaxed text-[#b8d2ed]">Rencanakan hari dengan pembacaan kondisi saat ini dan tren enam hari ke depan.</p>
          </aside>
        </section>

        <section className="relative z-10 mt-7 flex flex-col justify-between gap-4 border-t border-[#cdd9e7] pt-6 sm:flex-row sm:items-center lg:ml-[159px]">
          <div className="flex flex-wrap gap-2">
            {QUICK_PLACES.map((quickPlace) => (
              <button key={quickPlace.name} onClick={() => choosePlace(quickPlace)} className={`rounded-full px-3.5 py-2 text-xs font-bold transition ${place.name === quickPlace.name ? "bg-[#175bba] text-white" : "border border-[#cbd9e7] bg-[#fffdf8] text-[#47709c] hover:border-[#175bba] hover:text-[#175bba]"}`}>
                {quickPlace.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.11em] text-[#7891ac]">
            <ThermometerSun className="h-4 w-4 text-[#e4a32a]" /> Sumber prakiraan: Open-Meteo
          </div>
        </section>
      </main>
    </div>
  );
}
