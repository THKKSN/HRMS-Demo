import { useEffect, useState } from 'react'

/** คืนค่า value ที่หน่วงไว้ delay ms — ใช้กับช่องค้นหาเพื่อลดจำนวน request */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
