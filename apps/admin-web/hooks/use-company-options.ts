import { useMemo } from 'react'
import type { CompanyTreeDto } from '@hrms/shared-types'
import { useCompanies } from './use-companies'

export type CompanyOption = { id: string; name: string; depth: number }

/** แปลง company tree เป็น list แบนสำหรับ <Select> พร้อมระดับชั้นสำหรับย่อหน้า */
export function useCompanyOptions() {
  const { data: tree = [], isLoading } = useCompanies()

  const options = useMemo(() => {
    const result: CompanyOption[] = []
    function walk(nodes: CompanyTreeDto[], depth: number) {
      for (const node of nodes) {
        if (node.isActive) result.push({ id: node.id, name: node.name, depth })
        walk(node.children, depth + 1)
      }
    }
    walk(tree, 0)
    return result
  }, [tree])

  return { options, isLoading }
}

/** ข้อความแสดงใน <option> — ย่อหน้าตามลำดับชั้นบริษัท */
export function companyOptionLabel(option: CompanyOption) {
  return option.depth > 0 ? `${' '.repeat(option.depth * 3)}└ ${option.name}` : option.name
}
