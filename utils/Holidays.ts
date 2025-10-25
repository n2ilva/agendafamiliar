export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Cálculo do Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher)
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=Março, 4=Abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function getBrazilHolidays(year: number): Holiday[] {
  const fixed: Holiday[] = [
    { date: `${year}-01-01`, name: 'Confraternização Universal' },
    { date: `${year}-04-21`, name: 'Tiradentes' },
    { date: `${year}-05-01`, name: 'Dia do Trabalhador' },
    { date: `${year}-09-07`, name: 'Independência do Brasil' },
    { date: `${year}-10-12`, name: 'Nossa Senhora Aparecida' },
    { date: `${year}-11-02`, name: 'Finados' },
    { date: `${year}-11-15`, name: 'Proclamação da República' },
    { date: `${year}-12-25`, name: 'Natal' },
  ];

  const easter = easterSunday(year);
  const carnaval = addDays(easter, -47); // Terça-feira de Carnaval
  const goodFriday = addDays(easter, -2); // Sexta-feira Santa
  const corpusChristi = addDays(easter, 60);

  const movable: Holiday[] = [
    { date: toYMD(carnaval), name: 'Carnaval' },
    { date: toYMD(goodFriday), name: 'Sexta-feira Santa' },
    { date: toYMD(corpusChristi), name: 'Corpus Christi' },
  ];

  return [...fixed, ...movable].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
 
