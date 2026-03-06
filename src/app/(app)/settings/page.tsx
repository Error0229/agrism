'use client'

import { useState, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { useFarmId } from '@/hooks/use-farm-id'
import { useExportFarmData, useImportFarmData } from '@/hooks/use-data-transfer'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Download,
  Upload,
  FileJson,
  User,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { FarmLocationSection } from '@/components/settings/farm-location-section'

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function todayStamp() {
  return new Date().toISOString().split('T')[0]
}

export default function SettingsPage() {
  const { user } = useUser()
  const farmId = useFarmId()

  const exportData = useExportFarmData(farmId)
  const importFarmData = useImportFarmData()

  const [exporting, setExporting] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    imported: string[]
    skipped: string[]
    errors: string[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- Export handlers ---

  async function handleExportJson() {
    if (!farmId || !exportData) return
    setExporting('json')
    try {
      const json = JSON.stringify(exportData, null, 2)
      downloadFile(json, `farm-data-${todayStamp()}.json`, 'application/json')
    } finally {
      setExporting(null)
    }
  }

  // --- Import handler ---

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !farmId) return

    setImporting(true)
    setImportResult(null)

    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const result = await importFarmData({ farmId, data: json })
      setImportResult(result)
    } catch (err) {
      setImportResult({
        imported: [],
        skipped: [],
        errors: [err instanceof Error ? err.message : 'JSON 解析失敗'],
      })
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="mt-1 text-muted-foreground">
          帳號資訊、資料匯出與匯入
        </p>
      </div>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            帳號資訊
          </CardTitle>
          <CardDescription>您的帳號與農場資訊</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
            <span className="text-muted-foreground">電子信箱</span>
            <span>{user?.emailAddresses?.[0]?.emailAddress ?? '—'}</span>
            <span className="text-muted-foreground">使用者名稱</span>
            <span>{user?.fullName ?? user?.firstName ?? '—'}</span>
            <span className="text-muted-foreground">農場 ID</span>
            <span className="font-mono text-xs">
              {farmId || '尚未設定'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Farm Location */}
      <FarmLocationSection farmId={farmId} />

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            資料匯出
          </CardTitle>
          <CardDescription>
            匯出完整農場資料為 JSON
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="mb-2 text-sm font-medium">完整備份</h4>
            <Button
              onClick={handleExportJson}
              disabled={!farmId || !exportData || exporting === 'json'}
              variant="outline"
              className="gap-2"
            >
              <FileJson className="h-4 w-4" />
              {exporting === 'json' ? '匯出中...' : '匯出完整 JSON'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            資料匯入
          </CardTitle>
          <CardDescription>
            從 v1 匯出的 JSON 檔案匯入資料至目前農場
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
              id="import-file"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={!farmId || importing}
              variant="outline"
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {importing ? '匯入中...' : '選擇 JSON 檔案'}
            </Button>
          </div>

          {importResult && (
            <div className="space-y-2 rounded-md border p-3 text-sm">
              {importResult.imported.length > 0 && (
                <div className="flex items-start gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">已匯入:</p>
                    <ul className="ml-4 list-disc">
                      {importResult.imported.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {importResult.errors.length > 0 && (
                <div className="flex items-start gap-2 text-red-700 dark:text-red-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">錯誤:</p>
                    <ul className="ml-4 list-disc">
                      {importResult.errors.map((err) => (
                        <li key={err}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {importResult.imported.length === 0 &&
                importResult.errors.length === 0 && (
                  <p className="text-muted-foreground">沒有可匯入的資料</p>
                )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
