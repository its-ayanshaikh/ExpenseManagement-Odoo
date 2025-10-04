import { api } from './api'
import { CountryCurrency, CurrencyConversion } from '../types'

export class CurrencyService {
  // Get list of countries with their currencies
  async getCountriesWithCurrencies(): Promise<CountryCurrency[]> {
    return api.get<CountryCurrency[]>('/currencies/countries')
  }

  // Convert amount between currencies
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<CurrencyConversion> {
    return api.get<CurrencyConversion>('/currencies/convert', {
      params: {
        amount,
        from: fromCurrency,
        to: toCurrency,
      },
    })
  }
}

export const currencyService = new CurrencyService()