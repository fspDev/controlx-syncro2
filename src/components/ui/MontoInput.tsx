import { useState } from 'react'
import { cn, formatMiles, formatCurrency, soloDigitos, montoDesdeDigitos } from '@/lib/utils'

interface MontoInputProps {
  value: number
  onChange: (n: number) => void
  onBlur?: () => void
  label?: string
  placeholder?: string
  ariaLabel?: string
  readOnly?: boolean
  disabled?: boolean
  className?: string
  /** Vacío en vez de "0" cuando no está enfocado y el valor es cero (grillas tipo cuenta corriente). */
  blankWhenZero?: boolean
  /** Formato "$ 40.000" (con símbolo) en vez de "40.000" plano cuando no está enfocado. */
  currency?: boolean
}

/**
 * Input numérico que muestra separador de miles en vivo a medida que se
 * tipea (ver formatMiles) — regla general de toda la plataforma para
 * cualquier campo de monto. Mientras está enfocado se ve el número "crudo"
 * con puntos ("23.000"); al perder el foco se muestra el formato final
 * (con "$" si `currency`, vacío en cero si `blankWhenZero`).
 */
export function MontoInput({
  value, onChange, onBlur, label, placeholder = '0', ariaLabel, readOnly, disabled, className, blankWhenZero, currency,
}: MontoInputProps) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState('')

  const displayUnfocused = () => {
    if (blankWhenZero && !value) return ''
    return currency ? formatCurrency(value) : formatMiles(value)
  }

  const input = (
    <input
      type="text"
      inputMode="numeric"
      aria-label={ariaLabel || label}
      readOnly={readOnly}
      disabled={disabled}
      value={focused ? (raw ? formatMiles(Number(raw)) : '') : displayUnfocused()}
      onFocus={e => {
        if (readOnly || disabled) return
        setFocused(true)
        setRaw(value ? String(value) : '')
        e.target.select()
      }}
      onChange={e => {
        if (readOnly || disabled) return
        const digits = soloDigitos(e.target.value)
        setRaw(digits)
        onChange(montoDesdeDigitos(digits))
      }}
      onBlur={() => { setFocused(false); onBlur?.() }}
      placeholder={placeholder}
      className={cn(
        'w-full text-sm tabular-nums placeholder:text-gray-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    />
  )

  if (!label) return input
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-400">{label}</label>
      {input}
    </div>
  )
}
