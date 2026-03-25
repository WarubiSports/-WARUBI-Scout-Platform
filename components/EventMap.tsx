import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { ScoutingEvent } from '../types';
import { MapPin, Calendar, Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon (leaflet + bundlers issue)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom scout-accent marker
const scoutIcon = new L.DivIcon({
  className: '',
  html: `<div style="width:32px;height:32px;background:#10b981;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#064e3b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -34],
});

// Simple geocoding cache (persists in sessionStorage)
const CACHE_KEY = 'scout_geocode_cache';
const getCache = (): Record<string, [number, number]> => {
  try {
    return JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}');
  } catch { return {}; }
};
const setCache = (cache: Record<string, [number, number]>) => {
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
};

async function geocodeSingle(query: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': 'ScoutBuddy/1.0' } }
    );
    const data = await res.json();
    if (data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
  } catch {}
  return null;
}

async function geocode(location: string): Promise<[number, number] | null> {
  const cache = getCache();
  const key = location.trim().toLowerCase();
  if (cache[key]) return cache[key];

  // Try full address first, then progressively simpler versions
  const parts = location.split(',').map(s => s.trim());
  const attempts = [location];
  if (parts.length > 2) attempts.push(parts.slice(1).join(', ')); // drop venue name
  if (parts.length > 1) attempts.push(parts[parts.length - 1]); // just city/state

  for (const attempt of attempts) {
    const coords = await geocodeSingle(attempt);
    if (coords) {
      cache[key] = coords;
      setCache(cache);
      return coords;
    }
    await new Promise(r => setTimeout(r, 350));
  }
  return null;
}

interface EventMapProps {
  events: ScoutingEvent[];
  onEventClick: (event: ScoutingEvent) => void;
  className?: string;
}

interface GeoEvent {
  event: ScoutingEvent;
  coords: [number, number];
}

export const EventMap: React.FC<EventMapProps> = ({ events, onEventClick, className }) => {
  const [geoEvents, setGeoEvents] = useState<GeoEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    let cancelled = false;

    const geocodeAll = async () => {
      setLoading(true);
      const results: GeoEvent[] = [];

      for (const event of events) {
        if (cancelled) break;
        if (!event.location) continue;
        const key = event.location.trim().toLowerCase();
        const cached = getCache()[key];
        const coords = await geocode(event.location);
        if (coords) {
          results.push({ event, coords });
          // Update map as markers come in
          if (!cancelled) setGeoEvents([...results]);
        }
        // Delay only for uncached requests (Nominatim rate limit)
        if (!cached) await new Promise(r => setTimeout(r, 350));
      }

      if (!cancelled) {
        setGeoEvents(results);
        setLoading(false);

        if (results.length > 0 && mapRef.current) {
          const bounds = L.latLngBounds(results.map(g => g.coords));
          mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
        }
      }
    };

    geocodeAll();
    return () => { cancelled = true; };
  }, [events]);

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-scout-700 ${className || "h-[calc(100vh-200px)] md:h-[600px]"}`}>
      {loading && (
        <div className="absolute inset-0 z-[10] bg-scout-900/80 flex items-center justify-center">
          <div className="flex items-center gap-3 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm font-bold">Loading map...</span>
          </div>
        </div>
      )}
      <MapContainer
        center={[39.8, -98.5]}
        zoom={4}
        className="h-full w-full"
        ref={mapRef}
        style={{ background: '#0f1923' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {geoEvents.map((geo) => (
          <Marker
            key={geo.event.id}
            position={geo.coords}
            icon={scoutIcon}
            eventHandlers={{ click: () => onEventClick(geo.event) }}
          >
            <Popup>
              <div
                className="cursor-pointer min-w-[180px]"
                onClick={() => onEventClick(geo.event)}
              >
                <p className="font-bold text-sm text-gray-900 mb-1">{geo.event.title}</p>
                <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                  <Calendar size={10} />
                  {formatDate(geo.event.date)}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <MapPin size={10} />
                  {geo.event.location}
                </div>
                <div className="mt-2 text-[10px] font-bold text-emerald-600 uppercase">{geo.event.type}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {!loading && geoEvents.length === 0 && events.length > 0 && (
        <div className="absolute inset-0 z-[10] bg-scout-900/60 flex items-center justify-center">
          <p className="text-sm text-gray-400 font-bold">Could not locate events on the map</p>
        </div>
      )}
    </div>
  );
};
