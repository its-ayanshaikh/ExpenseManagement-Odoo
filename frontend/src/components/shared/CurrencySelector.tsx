import React, { useState, useEffect } from 'react'
import { CountryCurrency } from '../../types'
import { currencyService } from '../../services/currencyService'

interface CurrencySelectorProps {
  value: string
  onChange: (currency: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  showFlag?: boolean
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder = 'Select currency',
  showFlag = true,
}) => {
  const [countries, setCountries] = useState<CountryCurrency[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setLoading(true)
        const data = await currencyService.getCountriesWithCurrencies()
        setCountries(data)
        setError(null)
      } catch (err) {
        setError('Failed to load currencies')
        console.error('Error fetching countries:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCountries()
  }, [])

  const getCountryFlag = (countryCode: string): string => {
    // Convert country code to flag emoji
    return countryCode
      .toUpperCase()
      .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
  }

  const selectedCountry = countries.find(country => country.currency.code === value)

  if (loading) {
    return (
      <div className={`relative ${className}`}>
        <select disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100">
          <option>Loading currencies...</option>
        </select>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`relative ${className}`}>
        <select disabled className="w-full px-3 py-2 border border-red-300 rounded-md bg-red-50">
          <option>{error}</option>
        </select>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">{placeholder}</option>
        {countries.map((country) => (
          <option key={country.code} value={country.currency.code}>
            {showFlag && `${getCountryFlag(country.code)} `}
            {country.currency.code} - {country.currency.name}
          </option>
        ))}
      </select>
      
      {/* Display selected currency info */}
      {selectedCountry && (
        <div className="absolute right-10 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <span className="text-sm text-gray-500">
            {selectedCountry.currency.symbol}
          </span>
        </div>
      )}
    </div>
  )
}