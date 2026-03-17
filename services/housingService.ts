import { supabaseRest, isSupabaseConfigured } from '../lib/supabase';

interface HouseAvailability {
  house_name: string;
  total_beds: number;
  occupied: number;
  available: number;
}

interface AvailabilityResult {
  houses: HouseAvailability[];
  total_beds: number;
  total_available: number;
  error: string | null;
}

export async function checkHousingAvailability(
  startDate: string,
  endDate: string
): Promise<AvailabilityResult> {
  if (!isSupabaseConfigured || !startDate || !endDate) {
    return { houses: [], total_beds: 0, total_available: 0, error: null };
  }

  try {
    const [housesRes, roomsRes, playersRes, trialistsRes] = await Promise.all([
      supabaseRest.select<any>('houses', 'select=id,name&order=name'),
      supabaseRest.select<any>('rooms', 'select=id,house_id,capacity&order=house_id'),
      supabaseRest.select<any>('players', 'select=id,room_id,program_start_date,program_end_date,status&status=eq.active'),
      supabaseRest.select<any>('trial_prospects', 'select=id,room_id,trial_start_date,trial_end_date,status&status=in.(requested,scheduled,in_progress)'),
    ]);

    const houses = housesRes.data || [];
    const rooms = roomsRes.data || [];
    const players = playersRes.data || [];
    const trialists = trialistsRes.data || [];

    const result: HouseAvailability[] = houses.map((house: any) => {
      const houseRooms = rooms.filter((r: any) => r.house_id === house.id || r.house_id === house.name);
      const totalBeds = houseRooms.reduce((sum: number, r: any) => sum + (r.capacity || 2), 0);
      const roomIds = new Set(houseRooms.map((r: any) => r.id));

      const playerCount = players.filter((p: any) => {
        if (!p.room_id || !roomIds.has(p.room_id)) return false;
        const pStart = p.program_start_date || '2000-01-01';
        const pEnd = p.program_end_date || '2099-12-31';
        return pStart <= endDate && pEnd >= startDate;
      }).length;

      const trialistCount = trialists.filter((t: any) => {
        if (!t.room_id || !roomIds.has(t.room_id)) return false;
        if (!t.trial_start_date || !t.trial_end_date) return false;
        return t.trial_start_date <= endDate && t.trial_end_date >= startDate;
      }).length;

      const occupied = playerCount + trialistCount;
      return {
        house_name: house.name,
        total_beds: totalBeds,
        occupied,
        available: Math.max(0, totalBeds - occupied),
      };
    });

    const totalBeds = result.reduce((s, h) => s + h.total_beds, 0);
    const totalAvailable = result.reduce((s, h) => s + h.available, 0);

    return { houses: result, total_beds: totalBeds, total_available: totalAvailable, error: null };
  } catch (err) {
    return { houses: [], total_beds: 0, total_available: 0, error: 'Failed to check availability' };
  }
}
