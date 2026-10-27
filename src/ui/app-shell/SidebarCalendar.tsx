import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n';
import { Icon } from '../Icon';

/** A local month display; appointments remain owned by their future calendar module. */
export function SidebarCalendar({ variant }: { variant?: 'keke' }) {
  const { language } = useI18n();
  const [today, setToday] = useState(() => new Date());
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  useEffect(() => {
    const timer = window.setInterval(() => setToday(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const offset = (month.getDay() + 6) % 7;
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const weeks = Math.ceil((offset + days) / 7);
  const displayWeeks = variant === 'keke' ? 6 : weeks;
  const title = new Intl.DateTimeFormat(language, { year: 'numeric', month: 'long' }).format(month);
  const weekday = new Intl.DateTimeFormat(language, { weekday: 'short' });
  const shortMonth = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(month).toUpperCase();
  const moveMonth = (delta: number) => setMonth(new Date(year, monthIndex + delta, 1));

  return (
    <section className="conflux-sidebar-calendar" aria-label="资料日历">
      <header>
        <button type="button" aria-label="上个月" onClick={() => moveMonth(-1)}><span className="conflux-calendar-previous-icon"><Icon name="chevron" size={16} /></span></button>
        <strong aria-live="polite">{variant === 'keke' ? <><b>{monthIndex + 1}</b>月 <em>{shortMonth} {year}</em></> : title}</strong>
        <button type="button" aria-label="下个月" onClick={() => moveMonth(1)}><Icon name="chevron" size={16} /></button>
      </header>
      <table aria-label={title}>
        <thead><tr>{Array.from({ length: 7 }, (_, index) => <th key={index} scope="col">{variant === 'keke' ? '一二三四五六日'[index] : weekday.format(new Date(2026, 0, 5 + index))}</th>)}</tr></thead>
        <tbody>{Array.from({ length: displayWeeks }, (_, week) => (
          <tr key={week}>{Array.from({ length: 7 }, (_, column) => {
            const day = week * 7 + column - offset + 1;
            if (day < 1 || day > days) return <td key={column}>{variant === 'keke' ? <span className="keke-calendar-other-day">{day < 1 ? new Date(year, monthIndex, 0).getDate() + day : day - days}</span> : null}</td>;
            const isToday = year === today.getFullYear() && monthIndex === today.getMonth() && day === today.getDate();
            const date = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            return <td key={column}><time dateTime={date} aria-current={isToday ? 'date' : undefined}>{day}</time></td>;
          })}</tr>
        ))}</tbody>
      </table>
      <button type="button" className="conflux-calendar-today" onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>回到本月</button>
    </section>
  );
}
