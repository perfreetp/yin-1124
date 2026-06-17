import React, { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download, Trash2, Eye } from 'lucide-react'
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
}

export const BatchImport: React.FC = () => {
  const { importLogs, importBills } = useWorkbenchStore()
  const [previewData, setPreviewData] = useState<PreviewBill[]>([])
  const [fileName, setFileName] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [selectedLog, setSelectedLog] = useState<ImportLog | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const mockData: PreviewBill[] = []
    for (let i = 1; i <= 35; i++) {
      const hasError = i === 8 || i === 22
      const dueDate = dayjs().add(Math.floor(Math.random() * 180), 'day')
      const issueDate = dueDate.subtract(180, 'day')
      mockData.push({
        billNo: `EC${dayjs().format('YYYYMMDD')}${String(10000 + i).padStart(8, '0')}`,
        amount: hasError ? -1 : (Math.floor(Math.random() * 900) + 100) * 10000,
        issueDate: issueDate.format('YYYY-MM-DD'),
        dueDate: hasError ? '无效日期' : dueDate.format('YYYY-MM-DD'),
        daysToDue: hasError ? 0 : dueDate.diff(dayjs(), 'day'),
        acceptorName: [
          '中航国际控股有限公司',
          '中铁建设集团有限公司',
          '恒大地产集团有限公司',
          '中国建筑第八工程局',
        ][Math.floor(Math.random() * 4)],
        drawer: `出票企业${i}有限公司`,
        payee: `收款企业${i}有限公司`,
        holdType: Math.random() > 0.4 ? 'self_held' : 'endorsed',
        _rowError: hasError ? (i === 8 ? '金额不能为负数' : '到期日期格式错误') : undefined,
      })
    }
    setPreviewData(mockData)
    setShowPreview(true)
  }

  const handleConfirmImport = () => {
    const validBills = previewData
      .filter((b) => !b._rowError)
      .map((b) => ({
        id: '',
        billNo: b.billNo!,
        amount: b.amount!,
        issueDate: b.issueDate!,
        dueDate: b.dueDate!,
        daysToDue: b.daysToDue!,
        acceptorId: 'acc001',
        acceptorName: b.acceptorName!,
        drawer: b.drawer!,
        payee: b.payee!,
        status: b.holdType === 'endorsed' ? 'endorsed' : 'holding',
        holdType: b.holdType!,
        requiresReview: b.amount! >= 5000000,
        reviewed: b.amount! < 5000000,
        riskLevel: b.daysToDue! <= 7 ? 'high' : b.daysToDue! <= 15 ? 'medium' : 'low',
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
    { key: 'index', title: '行号', width: 60, render: (_, __, idx) => idx + 1 },
    { key: 'billNo', title: '票据号码', dataIndex: 'billNo' },
    { key: 'amount', title: '票面金额(元)', dataIndex: 'amount', align: 'right',
      render: (v) => v > 0 ? formatAmountFull(v) : <span className="text-[var(--color-danger)]">{v}</span> },
    { key: 'issueDate', title: '出票日期', dataIndex: 'issueDate' },
    { key: 'dueDate', title: '到期日期', dataIndex: 'dueDate',
      render: (v) => v === '无效日期' ? <span className="text-[var(--color-danger)]">{v}</span> : v },
    { key: 'acceptorName', title: '承兑人', dataIndex: 'acceptorName' },
    { key: 'holdType', title: '持有类型', dataIndex: 'holdType',
      render: (v) => v === 'self_held' ? <Tag variant="primary">自持</Tag> : <Tag variant="info">已背书</Tag> },
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

  return (
    <div className="flex flex-col gap-4 h-full">
      <Card
        title="批量导入票据清单"
        extra={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon={<Download size={14} />}>
              下载模板
            </Button>
          </div>
        }
      >
        <div
          className="border-2 border-dashed border-[var(--color-border-dark)] rounded-md p-10 text-center hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-bg)] transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Upload size={40} className="mx-auto text-[var(--color-primary)] mb-3" />
          <div className="text-[var(--color-text-primary)] font-medium mb-1">
            点击或拖拽文件到此处上传
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mb-3">
            支持 Excel (.xlsx, .xls) 和 CSV 格式，单文件最多支持 5000 条票据
          </div>
          <Button variant="primary" icon={<FileSpreadsheet size={14} />}>
            选择文件
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded bg-[var(--color-bg-tertiary)]">
            <div className="text-xs text-[var(--color-text-muted)] mb-1">必填字段</div>
            <div className="text-sm text-[var(--color-text-primary)] font-medium">票据号、金额、出票日、到期日、承兑人</div>
          </div>
          <div className="p-3 rounded bg-[var(--color-bg-tertiary)]">
            <div className="text-xs text-[var(--color-text-muted)] mb-1">选填字段</div>
            <div className="text-sm text-[var(--color-text-primary)] font-medium">出票人、收款人、客户经理、背书信息</div>
          </div>
          <div className="p-3 rounded bg-[var(--color-bg-tertiary)]">
            <div className="text-xs text-[var(--color-text-muted)] mb-1">数据校验</div>
            <div className="text-sm text-[var(--color-text-primary)] font-medium">格式校验、重复校验、逻辑校验</div>
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
              <span className="text-[var(--color-success)]">校验通过 <b>{successCount}</b> 条</span>
              {errorCount > 0 && (
                <span className="text-[var(--color-danger)]">校验失败 <b>{errorCount}</b> 条</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowPreview(false)}>取消</Button>
              <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => { setPreviewData([]); setShowPreview(false) }}>
                清空
              </Button>
              <Button variant="primary" onClick={handleConfirmImport} disabled={successCount === 0}>
                确认导入 ({successCount})
              </Button>
            </div>
          </div>
        }
      >
        <div className="max-h-[60vh] overflow-auto">
          <Table columns={previewColumns} data={previewData} />
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
              <div><span className="text-[var(--color-text-muted)]">成功：</span><span className="text-[var(--color-success)]">{selectedLog.successCount}</span></div>
              <div><span className="text-[var(--color-text-muted)]">失败：</span><span className="text-[var(--color-danger)]">{selectedLog.failedCount}</span></div>
            </div>
            {selectedLog.errors && selectedLog.errors.length > 0 && (
              <div>
                <div className="text-sm font-medium text-[var(--color-text-primary)] mb-2">错误明细</div>
                <div className="bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)] rounded p-3 space-y-1">
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
