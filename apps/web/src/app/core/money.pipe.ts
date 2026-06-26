import { Pipe, PipeTransform } from '@angular/core';

/** Formats integer EUR cents as a currency string. `decimals=true` shows cents. */
@Pipe({ name: 'money', standalone: true })
export class MoneyPipe implements PipeTransform {
  transform(cents: number | null | undefined, decimals = false): string {
    const value = (cents ?? 0) / 100;
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0,
    }).format(value);
  }
}
