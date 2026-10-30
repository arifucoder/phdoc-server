import { CLINIC_UTC_OFFSET } from "./schedule.constant";

// "2026-11-01" + "09:00" → ঢাকার সকাল 9টা (যে কোনো server-এ একই ফল)
export const buildDateTime = (date: string, time: string): Date => {
	return new Date(`${date}T${time}:00${CLINIC_UTC_OFFSET}`);
};

export const addMinutes = (date: Date, minutes: number): Date => {
	return new Date(date.getTime() + minutes * 60_000);
};

// "2026-11-01" → "2026-11-02" (UTC-তে হিসাব, তাই timezone-এর প্রভাব নেই)
export const addDaysToDateString = (date: string, days: number): string => {
	const d = new Date(`${date}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
};
