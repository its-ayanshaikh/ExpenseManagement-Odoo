import { api } from './api'
import { CountryCurrency, CurrencyConversion } from '../types'

export class CurrencyService {
  // Get list of countries with their currencies
  async getCountriesWithCurrencies(): Promise<CountryCurrency[]> {
    const response = await api.get<{
      success: boolean
      data: CountryCurrency[]
      warning?: string
    }>('/currencies/countries')
    return response.data
  }

  // Convert amount between currencies
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<CurrencyConversion> {
    const response = await api.get<{
      success: boolean
      data: {
        originalAmount: number
        originalCurrency: string
        convertedAmount: number
        convertedCurrency: string
        exchangeRate: number
        timestamp: string
      }
    }>('/currencies/convert', {
      params: {
        amount,
        from: fromCurrency,
        to: toCurrency,
      },
    })
    return {
      fromCurrency: response.data.originalCurrency,
      toCurrency: response.data.convertedCurrency,
      amount: response.data.originalAmount,
      convertedAmount: response.data.convertedAmount,
      exchangeRate: response.data.exchangeRate,
    }
  }
}

export const currencyService = new CurrencyService()