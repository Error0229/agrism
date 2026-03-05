import { Cloud, CloudRain, Sun } from 'lucide-react'

export function weatherCodeLabel(code: number): string {
  if (code === 0) return '晴天'
  if (code <= 3) return '多雲'
  if (code <= 49) return '霧'
  if (code <= 59) return '毛毛雨'
  if (code <= 69) return '下雨'
  if (code <= 79) return '下雪'
  if (code <= 84) return '陣雨'
  if (code <= 94) return '雷雨'
  return '暴風雨'
}

export function weatherCodeIcon(code: number) {
  if (code === 0) return <Sun className="size-5 text-yellow-500" />
  if (code <= 3) return <Cloud className="size-5 text-gray-400" />
  return <CloudRain className="size-5 text-blue-400" />
}
