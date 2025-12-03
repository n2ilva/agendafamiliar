/**
 * Value Object: DateRange
 * Representa um intervalo de datas
 * 
 * Princípio SOLID: Single Responsibility (S)
 * - Encapsula lógica de manipulação de intervalos de datas
 */

export interface DateRangeProps {
  start: Date;
  end: Date;
}

export class DateRange {
  private readonly _start: Date;
  private readonly _end: Date;

  constructor(start: Date, end: Date) {
    if (start > end) {
      throw new Error('Data de início não pode ser maior que data de fim');
    }
    this._start = new Date(start);
    this._end = new Date(end);
  }

  get start(): Date {
    return new Date(this._start);
  }

  get end(): Date {
    return new Date(this._end);
  }

  /**
   * Cria range para o dia atual
   */
  static today(): DateRange {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    
    return new DateRange(today, endOfDay);
  }

  /**
   * Cria range para a semana atual
   */
  static thisWeek(): DateRange {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    const start = new Date(today);
    start.setDate(today.getDate() - dayOfWeek);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    return new DateRange(start, end);
  }

  /**
   * Cria range para o mês atual
   */
  static thisMonth(): DateRange {
    const today = new Date();
    
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    
    return new DateRange(start, end);
  }

  /**
   * Cria range para o ano atual
   */
  static thisYear(): DateRange {
    const today = new Date();
    
    const start = new Date(today.getFullYear(), 0, 1);
    const end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
    
    return new DateRange(start, end);
  }

  /**
   * Cria range para os próximos N dias
   */
  static nextDays(days: number): DateRange {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const end = new Date(today);
    end.setDate(today.getDate() + days);
    end.setHours(23, 59, 59, 999);
    
    return new DateRange(today, end);
  }

  /**
   * Cria range para os últimos N dias
   */
  static lastDays(days: number): DateRange {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const start = new Date(today);
    start.setDate(today.getDate() - days);
    start.setHours(0, 0, 0, 0);
    
    return new DateRange(start, today);
  }

  /**
   * Verifica se uma data está dentro do range
   */
  contains(date: Date): boolean {
    const d = new Date(date);
    return d >= this._start && d <= this._end;
  }

  /**
   * Verifica se dois ranges se sobrepõem
   */
  overlaps(other: DateRange): boolean {
    return this._start <= other._end && this._end >= other._start;
  }

  /**
   * Calcula duração em dias
   */
  getDurationInDays(): number {
    const diffTime = Math.abs(this._end.getTime() - this._start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calcula duração em horas
   */
  getDurationInHours(): number {
    const diffTime = Math.abs(this._end.getTime() - this._start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60));
  }

  /**
   * Expande o range por N dias em cada direção
   */
  expand(days: number): DateRange {
    const newStart = new Date(this._start);
    newStart.setDate(newStart.getDate() - days);
    
    const newEnd = new Date(this._end);
    newEnd.setDate(newEnd.getDate() + days);
    
    return new DateRange(newStart, newEnd);
  }

  /**
   * Obtém interseção com outro range
   */
  intersection(other: DateRange): DateRange | null {
    if (!this.overlaps(other)) return null;
    
    const start = new Date(Math.max(this._start.getTime(), other._start.getTime()));
    const end = new Date(Math.min(this._end.getTime(), other._end.getTime()));
    
    return new DateRange(start, end);
  }

  /**
   * Obtém todas as datas dentro do range
   */
  getAllDates(): Date[] {
    const dates: Date[] = [];
    const current = new Date(this._start);
    
    while (current <= this._end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }

  /**
   * Formata o range como string
   */
  toString(separator: string = ' - '): string {
    const formatDate = (d: Date) => d.toLocaleDateString('pt-BR');
    return `${formatDate(this._start)}${separator}${formatDate(this._end)}`;
  }

  /**
   * Converte para objeto plano
   */
  toObject(): DateRangeProps {
    return {
      start: this.start,
      end: this.end,
    };
  }

  /**
   * Verifica igualdade
   */
  equals(other: DateRange): boolean {
    return (
      this._start.getTime() === other._start.getTime() &&
      this._end.getTime() === other._end.getTime()
    );
  }
}
