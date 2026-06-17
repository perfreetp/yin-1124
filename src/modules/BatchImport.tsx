import React, { useState, useRef, useCallback, useMemo } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download, Trash2, Eye, RefreshCw, Minus } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Table, Column } from '@/components/Table'
import { Tag } from '@/components/Tag'
import { Modal } from '@/components/Modal'
import { useWorkbenchStore, formatAmountFull } from '@/store/workbench'
import type { Bill, ImportLog } from '@/types'
import dayjs from 'dayjs'

interface PreviewBill extends Partial<Bill> {
  _rowError?: string
  _rowNumber?: number
  _importStatus?: 'new' | 'exists'
}

interface FieldMapping {
  billNo: string[]
  amount: string[]
  issueDate: string[]
  dueDate: string[]
  acceptorName: string[]
  drawer: string[]
  payee: string[]
  holdType: string[]
}

const FIELD_MAPPING: FieldMapping = {
  billNo: ['票据号', '票据号码', '票号', 'billNo', 'bill_no', '电子票号'],
  amount: ['票面金额', '金额', '票载金额', 'amount', 'bill_amount', '票据金额'],
  issueDate: ['出票日期', '出票日', 'issueDate', 'issue_date', '开票日期'],
  dueDate: ['到期日期', '到期日', 'dueDate', 'due_date', '票据到期日'],
  acceptorName: ['承兑人', '承兑人名称', 'acceptor', 'acceptor_name', '付款人'],
  drawer: ['出票人', '出票人名称', 'drawer', 'drawer_name'],
  payee: ['收款人', '收款人名称', 'payee', 'payee_name'],
  holdType: ['持有类型', '持有方式', 'holdType', '类型', '票据类型'],
}

function parseCSV(text: string): string[][] {
  const lines: string[][] = []
  let currentLine: string[] = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          currentField += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        currentField += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        currentLine.push(currentField.trim())
        currentField = ''
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && text[i + 1] === '\n') i++
        currentLine.push(currentField.trim())
        if (currentLine.length > 0 && currentLine.some((f) => f !== '')) {
          lines.push(currentLine)
        }
        currentLine = []
        currentField = ''
      } else {
        currentField += char
      }
    }
  }

  if (currentField !== '' || currentLine.length > 0) {
    currentLine.push(currentField.trim())
    if (currentLine.length > 0 && currentLine.some((f) => f !== '')) {
      lines.push(currentLine)
    }
  }

  return lines
}

function detectColumnIndex(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = headers.findIndex((h) => h.trim().toLowerCase() === candidate.toLowerCase())
    if (idx >= 0) return idx
  }
  for (const candidate of candidates) {
    const idx = headers.findIndex((h) => h.trim().toLowerCase().includes(candidate.toLowerCase()))
    if (idx >= 0) return idx
  }
  return -1
}

function parseAmount(value: string): number {
  if (!value) return 0
  const cleaned = value.replace(/[,，]/g, '').replace(/[元￥¥]/g, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function parseDate(value: string): string {
  if (!value) return ''
  const cleaned = value.replace(/[年月日]/g, '-').replace(/\./g, '-').trim().replace(/-+$/, '')
  const d = dayjs(cleaned)
  return d.isValid() ? d.format('YYYY-MM-DD') : ''
}

function calculateDaysToDue(dueDate: string): number {
  if (!dueDate) return 999
  const d = dayjs(dueDate)
  return d.diff(dayjs(), 'day')
}

function detectRiskLevel(daysToDue: number, amount: number): Bill['riskLevel'] {
  if (daysToDue <= 3) return 'high'
  if (daysToDue <= 7) return 'medium'
  if (amount >= 10000000) return 'medium'
  return 'low'
}

export const BatchImport: React.FC = () => {
  const { importLogs, importBills, bills } = useWorkbenchStore()
  const [previewData, setPreviewData] = useState<PreviewBill[]>([])
  const [fileName, setFileName] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [selectedLog, setSelectedLog] = useState<ImportLog | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const existingBillNos = useMemo(() => {
    const set = new Set<string>()
    bills.forEach((b) => set.add(b.billNo.trim().toUpperCase()))
    return set
  }, [bills])

  const parseRows = (rows: string[][]) => {
    if (rows.length < 2) {
      alert('文件内容不足，至少需要表头和一行数据')
      return
    }

    const headers = rows[0].map((h) => (h ?? '').toString().trim())
    const dataRows = rows.slice(1)

    const billNoIdx = detectColumnIndex(headers, FIELD_MAPPING.billNo)
    const amountIdx = detectColumnIndex(headers, FIELD_MAPPING.amount)
    const issueDateIdx = detectColumnIndex(headers, FIELD_MAPPING.issueDate)
    const dueDateIdx = detectColumnIndex(headers, FIELD_MAPPING.dueDate)
    const acceptorIdx = detectColumnIndex(headers, FIELD_MAPPING.acceptorName)
    const drawerIdx = detectColumnIndex(headers, FIELD_MAPPING.drawer)
    const payeeIdx = detectColumnIndex(headers, FIELD_MAPPING.payee)
    const holdTypeIdx = detectColumnIndex(headers, FIELD_MAPPING.holdType)

    const previewBills: PreviewBill[] = dataRows.map((row, idx) => {
      const billNo = billNoIdx >= 0 ? (row[billNoIdx] ?? '').toString().trim() : ''
      const amount = amountIdx >= 0 ? parseAmount((row[amountIdx] ?? '').toString()) : 0
      const issueDate = issueDateIdx >= 0 ? parseDate((row[issueDateIdx] ?? '').toString()) : ''
      const dueDate = dueDateIdx >= 0 ? parseDate((row[dueDateIdx] ?? '').toString()) : ''
      const daysToDue = dueDate ? calculateDaysToDue(dueDate) : 999
      const acceptorName = acceptorIdx >= 0 ? (row[acceptorIdx] ?? '').toString().trim() : ''
      const drawer = drawerIdx >= 0 ? (row[drawerIdx] ?? '').toString().trim() : ''
      const payee = payeeIdx >= 0 ? (row[payeeIdx] ?? '').toString().trim() : ''
      const holdTypeRaw = holdTypeIdx >= 0 ? (row[holdTypeIdx] ?? '').toString().trim() : ''
      const holdType = /背书|转让|endorsed|已背书/i.test(holdTypeRaw) ? 'endorsed' : 'self_held'

      const errors: string[] = []
      if (!billNo) errors.push('票据号不能为空')
      if (amount <= 0) errors.push('金额无效')
      if (!dueDate) errors.push('到期日期无效')

      const normalizedBillNo = billNo.trim().toUpperCase()
      const importStatus: 'new' | 'exists' | undefined =
        errors.length === 0 && normalizedBillNo
          ? existingBillNos.has(normalizedBillNo)
            ? 'exists'
            : 'new'
          : undefined

      const bill: PreviewBill = {
        billNo,
        amount,
        issueDate,
        dueDate,
        daysToDue,
        acceptorName,
        drawer,
        payee,
        holdType,
        riskLevel: detectRiskLevel(daysToDue, amount),
        _rowNumber: idx + 2,
        _rowError: errors.length > 0 ? errors.join('；') : undefined,
        _importStatus: importStatus,
      }
      return bill
    })

    setPreviewData(previewBills)
    setShowPreview(true)
  }

  const parseFile = useCallback(async (file: File) => {
    setFileName(file.name)
    setIsParsing(true)

    try {
      const lowerName = file.name.toLowerCase()
      const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')
      const isCSV = lowerName.endsWith('.csv')

      if (!isExcel && !isCSV) {
        alert('仅支持 CSV、XLSX、XLS 格式文件')
        setIsParsing(false)
        return
      }

      if (isCSV) {
        const text = await file.text()
        const rows = parseCSV(text)
        parseRows(rows)
      } else {
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' })
        parseRows(rows as string[][])
      }
    } catch (e) {
      console.error('解析文件失败', e)
      alert('文件解析失败，请检查文件格式')
    } finally {
      setIsParsing(false)
    }
  }, [existingBillNos])

  const downloadErrorList = () => {
    const errorRows = previewData.filter((b) => b._rowError)
    if (errorRows.length === 0) {
      alert('没有校验失败的行')
      return
    }
    const headers = ['行号', '票据号', '金额', '到期日期', '承兑人', '错误原因']
    const data = errorRows.map((b) => [
      String(b._rowNumber ?? ''),
      b.billNo ?? '',
      String(b.amount ?? ''),
      b.dueDate ?? '',
      b.acceptorName ?? '',
      b._rowError ?? '',
    ])
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '错误清单')
    const baseName = fileName.replace(/\.(csv|xlsx|xls)$/i, '')
    XLSX.writeFile(wb, `${baseName}_错误清单.xlsx`)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    parseFile(file)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      const lowerName = file.name.toLowerCase()
      if (
        lowerName.endsWith('.csv') ||
        lowerName.endsWith('.xlsx') ||
        lowerName.endsWith('.xls')
      ) {
        parseFile(file)
      } else {
        alert('仅支持 CSV、XLSX、XLS 格式文件')
      }
    }
  }

  const handleConfirmImport = () => {
    const validBills = previewData
      .filter((b) => !b._rowError && b._importStatus !== 'exists')
      .map((b) => ({
        id: '',
        billNo: b.billNo!,
        amount: b.amount!,
        issueDate: b.issueDate || dayjs().subtract(180, 'day').format('YYYY-MM-DD'),
        dueDate: b.dueDate!,
        daysToDue: b.daysToDue ?? 999,
        acceptorId: 'acc_new',
        acceptorName: b.acceptorName || '未知承兑人',
        drawer: b.drawer || '-',
        payee: b.payee || '-',
        status: b.holdType === 'endorsed' ? 'endorsed' : 'holding',
        holdType: b.holdType || 'self_held',
        requiresReview: (b.amount || 0) >= 5000000,
        reviewed: (b.amount || 0) < 5000000,
        riskLevel: b.riskLevel || 'low',
        tags: [],
        createdAt: '',
        updatedAt: '',
      }))

    importBills(validBills as Bill[], fileName, '当前用户')
    setShowPreview(false)
    setPreviewData([])
    setFileName('')
  }

  const previewColumns: Column<PreviewBill>[] = [
    { key: 'rowNo', title: '行号', width: 60, render: (_, record) => record._rowNumber },
    { key: 'billNo', title: '票据号码', dataIndex: 'billNo',
      render: (v) => v ? <span className="font-mono text-xs">{v}</span> : <span className="text-[var(--color-danger)]">缺失</span> },
    { key: 'amount', title: '票面金额(元)', dataIndex: 'amount', align: 'right',
      render: (v) => v > 0 ? formatAmountFull(v) : <span className="text-[var(--color-danger)]">无效</span> },
    { key: 'issueDate', title: '出票日期', dataIndex: 'issueDate',
      render: (v) => v || <span className="text-[var(--color-text-muted)]">空</span> },
    { key: 'dueDate', title: '到期日期', dataIndex: 'dueDate',
      render: (v) => v ? v : <span className="text-[var(--color-danger)]">无效</span> },
    { key: 'acceptorName', title: '承兑人', dataIndex: 'acceptorName',
      render: (v) => v || <span className="text-[var(--color-text-muted)]">空</span> },
    { key: 'drawer', title: '出票人', dataIndex: 'drawer',
      render: (v) => v || <span className="text-[var(--color-text-muted)]">空</span> },
    { key: 'holdType', title: '持有类型', dataIndex: 'holdType',
      render: (v) => v === 'endorsed' ? <Tag variant="info">已背书</Tag> : <Tag variant="primary">自持</Tag> },
    {
      key: 'importStatus',
      title: '入库状态',
      width: 100,
      align: 'center',
      render: (_, record) => {
        if (record._rowError) {
          return <Tag variant="default"><Minus size={12} className="mr-1" />无法入库</Tag>
        }
        if (record._importStatus === 'exists') {
          return <Tag variant="warning"><RefreshCw size={12} className="mr-1" />已存在</Tag>
        }
        if (record._importStatus === 'new') {
          return <Tag variant="success"><CheckCircle2 size={12} className="mr-1" />待入库</Tag>
        }
        return null
      },
    },
    { key: 'error', title: '校验结果',
      render: (_, record) => record._rowError ? (
        <Tag variant="danger"><AlertCircle size={12} className="mr-1" />{record._rowError}</Tag>
      ) : (
        <Tag variant="success"><CheckCircle2 size={12} className="mr-1" />校验通过</Tag>
      )
    },
  ]

  const logColumns: Column<ImportLog>[] = [
    { key: 'fileName', title: '文件名', dataIndex: 'fileName' },
    { key: 'importTime', title: '导入时间', dataIndex: 'importTime' },
    { key: 'operator', title: '操作人', dataIndex: 'operator' },
    { key: 'totalCount', title: '总数', dataIndex: 'totalCount', align: 'center' },
    { key: 'successCount', title: '成功', dataIndex: 'successCount', align: 'center',
      render: (v) => <span className="text-[var(--color-success)] font-medium">{v}</span> },
    { key: 'failedCount', title: '失败', dataIndex: 'failedCount', align: 'center',
      render: (v) => v > 0 ? <span className="text-[var(--color-danger)] font-medium">{v}</span> : v },
    { key: 'action', title: '操作',
      render: (_, record) => (
        <Button variant="ghost" size="sm" icon={<Eye size={14} />} onClick={() => setSelectedLog(record)}>
          查看详情
        </Button>
      )
    },
  ]

  const errorCount = previewData.filter((b) => b._rowError).length
  const successCount = previewData.length - errorCount
  const newCount = previewData.filter((b) => !b._rowError && b._importStatus === 'new').length
  const existsCount = previewData.filter((b) => !b._rowError && b._importStatus === 'exists').length

  return (
    <div className="flex flex-col gap-4 h-full">
      <Card
        title="批量导入票据清单"
        extra={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon={<Download size={14} />}>
              下载CSV模板
            </Button>
          </div>
        }
      >
        <div
          className={`border-2 border-dashed rounded-md p-10 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]'
              : 'border-[var(--color-border-dark)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-bg)]'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.CSV,.xlsx,.XLSX,.xls,.XLS"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Upload size={40} className={`mx-auto mb-3 ${isDragging ? 'text-[var(--color-primary)]' : 'text-[var(--color-primary)]'}`} />
          <div className="text-[var(--color-text-primary)] font-medium mb-1">
            {isDragging ? '松开鼠标上传文件' : '点击或拖拽文件到此处上传'}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mb-3">
            支持 CSV、XLSX、XLS 格式文件，单文件最多支持 5000 条票据
          </div>
          <Button variant="primary" icon={<FileSpreadsheet size={14} />} disabled={isParsing}>
            {isParsing ? '解析中...' : '选择文件'}
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded bg-[var(--color-bg-tertiary)]">
            <div className="text-xs text-[var(--color-text-muted)] mb-1">必填字段</div>
            <div className="text-sm text-[var(--color-text-primary)] font-medium">票据号、金额、到期日、承兑人</div>
          </div>
          <div className="p-3 rounded bg-[var(--color-bg-tertiary)]">
            <div className="text-xs text-[var(--color-text-muted)] mb-1">选填字段</div>
            <div className="text-sm text-[var(--color-text-primary)] font-medium">出票人、收款人、持有类型</div>
          </div>
          <div className="p-3 rounded bg-[var(--color-bg-tertiary)]">
            <div className="text-xs text-[var(--color-text-muted)] mb-1">数据校验</div>
            <div className="text-sm text-[var(--color-text-primary)] font-medium">格式校验、金额校验、日期校验</div>
          </div>
          <div className="p-3 rounded bg-[var(--color-bg-tertiary)]">
            <div className="text-xs text-[var(--color-text-muted)] mb-1">操作留痕</div>
            <div className="text-sm text-[var(--color-text-primary)] font-medium">导入记录永久留存，支持内控抽查</div>
          </div>
        </div>
      </Card>

      <Card title="历史导入记录" className="flex-1 min-h-0" bodyClassName="h-full flex flex-col">
        <div className="flex-1 overflow-auto min-h-0">
          <Table columns={logColumns} data={importLogs} />
        </div>
      </Card>

      <Modal
        open={showPreview}
        title={`数据预览 - ${fileName}`}
        width="90%"
        onClose={() => setShowPreview(false)}
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-4 text-sm">
              <span>共 <b>{previewData.length}</b> 条</span>
              <span className="text-[var(--color-success)]">待入库 <b>{newCount}</b> 条</span>
              {existsCount > 0 && (
                <span className="text-[var(--color-warning)]">已存在 <b>{existsCount}</b> 条（跳过）</span>
              )}
              {errorCount > 0 && (
                <span className="text-[var(--color-danger)]">校验失败 <b>{errorCount}</b> 条</span>
              )}
              {errorCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Download size={14} />}
                  onClick={downloadErrorList}
                >
                  下载错误清单
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowPreview(false)}>取消</Button>
              <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => { setPreviewData([]); setShowPreview(false) }}>
                清空
              </Button>
              <Button variant="primary" onClick={handleConfirmImport} disabled={newCount === 0}>
                确认导入 ({newCount})
              </Button>
            </div>
          </div>
        }
      >
        <div className="max-h-[60vh] overflow-auto">
          <Table columns={previewColumns} data={previewData} />
        </div>
        <div className="mt-3 p-3 bg-[var(--color-bg-tertiary)] rounded text-xs text-[var(--color-text-muted)]">
          <div className="font-medium mb-1">导入说明：</div>
          <ul className="list-disc list-inside space-y-0.5">
            <li>系统会自动识别列名，支持常见的中英文表头命名方式</li>
            <li>金额支持带千分位、货币符号（¥、元）的格式</li>
            <li>日期支持 2026-01-01、2026/01/01、2026年1月1日 等常见格式</li>
            <li>持有类型包含"背书"或"转让"关键字会识别为已背书，否则视为自持</li>
            <li>票面金额 ≥ 500 万元的票据自动标记为需风险复核</li>
          </ul>
        </div>
      </Modal>

      <Modal
        open={!!selectedLog}
        title={`导入详情 - ${selectedLog?.fileName}`}
        width={600}
        onClose={() => setSelectedLog(null)}
        footer={null}
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-[var(--color-text-muted)]">导入时间：</span>{selectedLog.importTime}</div>
              <div><span className="text-[var(--color-text-muted)]">操作人：</span>{selectedLog.operator}</div>
              <div><span className="text-[var(--color-text-muted)]">总条数：</span>{selectedLog.totalCount}</div>
              <div><span className="text-[var(--color-text-muted)]">成功：</span><span className="text-[var(--color-success)] font-medium">{selectedLog.successCount}</span></div>
              <div><span className="text-[var(--color-text-muted)]">失败：</span><span className="text-[var(--color-danger)] font-medium">{selectedLog.failedCount}</span></div>
            </div>
            {selectedLog.errors && selectedLog.errors.length > 0 && (
              <div>
                <div className="text-sm font-medium text-[var(--color-text-primary)] mb-2">错误明细</div>
                <div className="bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)] rounded p-3 space-y-1 max-h-60 overflow-auto">
                  {selectedLog.errors.map((err, idx) => (
                    <div key={idx} className="text-sm text-[var(--color-danger)]">
                      第 {err.row} 行：{err.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
