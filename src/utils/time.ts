import dayjs, { type Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/zh-tw';

dayjs.extend(utc);
dayjs.locale('zh-tw');

/** 台灣固定 UTC+8 (無日光節約時間) */
const TAIPEI_OFFSET_MINUTES = 8 * 60;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 以台北時間 (UTC+8) 建立 Dayjs：所有日期分組、「今天」、時段時間顯示、日夜判斷都以台灣當地時間為準，
 * 不受使用者裝置時區影響（例如人在海外查看台灣天氣）。
 * - 無參數：現在時刻
 * - "YYYY-MM-DD"：視為台北當地日期的 00:00
 * - 其他 (ISO 字串、Date、時間戳)：同一個瞬間，以台北時間呈現
 */
export function twTime(input?: string | number | Date | Dayjs | null): Dayjs {
  if (typeof input === 'string' && DATE_ONLY.test(input)) {
    return dayjs.utc(input).utcOffset(TAIPEI_OFFSET_MINUTES, true);
  }
  return (input === undefined ? dayjs() : dayjs(input ?? undefined)).utcOffset(TAIPEI_OFFSET_MINUTES);
}
