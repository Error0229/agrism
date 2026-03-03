// Utility for auto-deriving facility type from a Chinese name string.

const FACILITY_NAME_PATTERNS: [RegExp, string][] = [
  [/蓄水池|水池|水塔/, 'water_tank'],
  [/馬達|水泵|幫浦/, 'motor'],
  [/道路|路|通道/, 'road'],
  [/工具間|倉庫|工具房/, 'tool_shed'],
  [/房屋|住宅|工寮|小屋/, 'house'],
]

export function deriveFacilityType(name: string): string {
  for (const [pattern, type] of FACILITY_NAME_PATTERNS) {
    if (pattern.test(name)) return type
  }
  return 'custom'
}
