import React, { useState, useMemo } from 'react'
import { Search, Filter, FileText, Clock, AlertTriangle, CheckCircle2, Send, XCircle, RefreshCw, Download, ChevronRight } from 'lucide-react'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Table, Column } from '@/components/Table'
import { Tag } from '@/components/Tag'
import { Input, Select, TextArea } from '@/components/Form'
import { Modal } from '@/components/Modal'
import { StatCard } from '@/components/StatCard'
import { useWorkbenchStore, formatAmountFull, getStatusLabel } from '@/store/workbench'
import type { PaymentPrompt, DishonorRecord, DisposalRecord, Bill } from '@/types'

export const DisposalRecords: React.FC = () => {
  const {
    bills,
    disposalRecords,
    paymentPrompts,
    dishonorRecords,
    addPaymentPrompt,
    updatePaymentFeedback,
    addDishonorRecord,
    updateRecourseStatus,
    addDisposalRecord,
  } = useWorkbenchStore()

  const [tab, setTab] = useState<'prompts' | 'dishonors' | 'trajectory'>('prompts')
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showPromptModal, setShowPromptModal] = useState(false)
  const [showDishonorModal, setShowDishonorModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showRecourseModal, setShowRecourseModal] = useState(false)
  const [showTrajectoryModal, setShowTrajectoryModal] = useState(false)
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [selectedPrompt, setSelectedPrompt] = useState<PaymentPrompt | null>(null)
  const [selectedDishonor, setSelectedDishonor] = useState<DishonorRecord | null>(null)

  const [promptMethod, setPromptMethod] = useState<'bank' | 'system' | 'manual'>('system')
  const [dishonorReason, setDishonorReason] = useState('')
  const [dishonorCode, setDishonorCode] = useState('DR001')
  const [feedbackStatus, setFeedbackStatus] = useState<'paid' | 'dishonored' | 'pending' | 'partial'>('pending')
  const [feedbackAmount, setFeedbackAmount] = useState('')
  const [feedbackNote, setFeedbackNote] = useState('')
  const [recourseStatus, setRecourseStatus] = useState<'none' | 'in_progress' | 'completed' | 'failed'>('in_progress')
  const [recourseAmount, setRecourseAmount] = useState('')
  const [recourseNote, setRecourseNote] = useState('')
  const [trajectoryBill, setTrajectoryBill] = useState<Bill | null>(null)

  const filteredPrompts = useMemo(() => {
    let result = [...paymentPrompts]
    if (keyword) {
      const kw = keyword.toLowerCase()
      result = result.filter((p) => {
        const bill = bills.find((b) => b.id === p.billId)
        return bill?.billNo.toLowerCase().includes(kw) || bill?.acceptorName.toLowerCase().includes(kw)
      })
    }
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.feedbackStatus === statusFilter || (!p.feedbackStatus && statusFilter === 'no_feedback'))
    }
    return result.sort((a, b) => b.promptDate.localeCompare(a.promptDate))
  }, [paymentPrompts, keyword, statusFilter, bills])

  const filteredDishonors = useMemo(() => {
    let result = [...dishonorRecords]
    if (keyword) {
      const kw = keyword.toLowerCase()
      result = result.filter((d) => {
        const bill = bills.find((b) => b.id === d.billId)
        return bill?.billNo.toLowerCase().includes(kw) || d.reason.includes(kw)
      })
    }
    if (statusFilter !== 'all') {
      result = result.filter((d) => d.recourseStatus === statusFilter)
    }
    return result.sort((a, b) => b.dishonorDate.localeCompare(a.dishonorDate))
  }, [dishonorRecords, keyword, statusFilter, bills])

  const filteredTrajectory = useMemo(() => {
    let result = [...disposalRecords]
    if (keyword) {
      const kw = keyword.toLowerCase()
      result = result.filter(
        (r) => r.billNo.toLowerCase().includes(kw) || r.action.includes(kw) || r.operatorName.includes(kw)
      )
    }
    return result
  }, [disposalRecords, keyword])

  const pendingFeedbackCount = paymentPrompts.filter((p) => !p.feedbackStatus).length
  const dishonoredCount = dishonorRecords.length
  const inRecourseCount = dishonorRecords.filter((d) => d.recourseStatus === 'in_progress').length
  const completedRecourseCount = dishonorRecords.filter((d) => d.recourseStatus === 'completed').length

  const dishonorOptions = [
    { value: 'DR001', label: 'DR001 - 承兑人账户余额不足' },
    { value: 'DR002', label: 'DR002 - 票据要素不符' },
    { value: 'DR003', label: 'DR003 - 承兑人拒付' },
    { value: 'DR004', label: 'DR004 - 司法冻结' },
    { value: 'DR005', label: 'DR005 - 其他原因' },
  ]

  const handlePromptSubmit = () => {
    if (selectedBill) {
      addPaymentPrompt({ billId: selectedBill.id, promptMethod })
    }
    setShowPromptModal(false)
    setSelectedBill(null)
    setPromptMethod('system')
  }

  const handleDishonorSubmit = () => {
    if (selectedBill && dishonorReason) {
      addDishonorRecord({
        billId: selectedBill.id,
        reason: dishonorReason,
        reasonCode: dishonorCode,
      })
    }
    setShowDishonorModal(false)
    setSelectedBill(null)
    setDishonorReason('')
    setDishonorCode('DR001')
  }

  const handleFeedbackSubmit = () => {
    if (selectedPrompt) {
      updatePaymentFeedback(selectedPrompt.id, {
        feedbackStatus,
        feedbackAmount: feedbackAmount ? Number(feedbackAmount) : undefined,
        feedbackNote: feedbackNote || undefined,
      })
    }
    setShowFeedbackModal(false)
    setSelectedPrompt(null)
    setFeedbackStatus('pending')
    setFeedbackAmount('')
    setFeedbackNote('')
  }

  const handleRecourseSubmit = () => {
    if (selectedDishonor) {
      updateRecourseStatus(selectedDishonor.id, {
        recourseStatus,
        recourseAmount: recourseAmount ? Number(recourseAmount) : undefined,
        recourseNote: recourseNote || undefined,
      })
    }
    setShowRecourseModal(false)
    setSelectedDishonor(null)
    setRecourseStatus('in_progress')
    setRecourseAmount('')
    setRecourseNote('')
  }

  const getDisposalTypeLabel = (type: string) => {
    const map: Record<string, { label: string; color: string }> = {
      import: { label: '批量导入', color: 'info' },
      status_change: { label: '状态变更', color: 'primary' },
      payment_prompt: { label: '提示付款', color: 'warning' },
      payment_feedback: { label: '付款反馈', color: 'success' },
      dishonor_record: { label: '拒付登记', color: 'danger' },
      recourse_action: { label: '追索操作', color: 'danger' },
      review: { label: '风险复核', color: 'warning' },
      assignment: { label: '任务分配', color: 'info' },
      note: { label: '备注添加', color: 'default' },
    }
    return map[type] || { label: type, color: 'default' }
  }

  const promptColumns: Column<PaymentPrompt>[] = [
    {
      key: 'billNo',
      title: '票据号码',
      render: (_, record) => {
        const bill = bills.find((b) => b.id === record.billId)
        return <span className="font-mono text-xs">{bill?.billNo}</span>
      },
    },
    {
      key: 'acceptor',
      title: '承兑人',
      render: (_, record) => {
        const bill = bills.find((b) => b.id === record.billId)
        return bill?.acceptorName
      },
    },
    {
      key: 'amount',
      title: '票面金额',
      align: 'right',
      render: (_, record) => {
        const bill = bills.find((b) => b.id === record.billId)
        return bill ? formatAmountFull(bill.amount) : '-'
      },
    },
    { key: 'promptDate', title: '提示日期', dataIndex: 'promptDate' },
    {
      key: 'promptMethod',
      title: '提示方式',
      dataIndex: 'promptMethod',
      render: (v) => (v === 'bank' ? '银行渠道' : v === 'system' ? '系统自动' : '人工操作'),
    },
    {
      key: 'feedback',
      title: '反馈状态',
      render: (_, record) => {
        if (!record.feedbackStatus) return <Tag variant="warning">待反馈</Tag>
        const map: Record<string, { label: string; color: string }> = {
          paid: { label: '已付款', color: 'success' },
          dishonored: { label: '已拒付', color: 'danger' },
          pending: { label: '处理中', color: 'warning' },
          partial: { label: '部分付款', color: 'info' },
        }
        const item = map[record.feedbackStatus]
        return <Tag variant={item.color as any}>{item.label}</Tag>
      },
    },
    { key: 'feedbackDate', title: '反馈日期', dataIndex: 'feedbackDate', render: (v) => v || '-' },
    {
      key: 'action',
      title: '操作',
      width: 220,
      render: (_, record) => (
        <div className="flex gap-1">
          {!record.feedbackStatus ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedPrompt(record)
                setShowFeedbackModal(true)
              }}
            >
              登记反馈
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => {
              setSelectedPrompt(record)
              setShowFeedbackModal(true)
            }}>
              修改反馈
            </Button>
          )}
          {record.feedbackStatus === 'dishonored' && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                const bill = bills.find((b) => b.id === record.billId)
                setSelectedBill(bill || null)
                setShowDishonorModal(true)
              }}
            >
              登记拒付
            </Button>
          )}
        </div>
      ),
    },
  ]

  const dishonorColumns: Column<DishonorRecord>[] = [
    {
      key: 'billNo',
      title: '票据号码',
      render: (_, record) => {
        const bill = bills.find((b) => b.id === record.billId)
        return <span className="font-mono text-xs">{bill?.billNo}</span>
      },
    },
    {
      key: 'acceptor',
      title: '承兑人',
      render: (_, record) => {
        const bill = bills.find((b) => b.id === record.billId)
        return bill?.acceptorName
      },
    },
    {
      key: 'amount',
      title: '票面金额',
      align: 'right',
      render: (_, record) => {
        const bill = bills.find((b) => b.id === record.billId)
        return bill ? formatAmountFull(bill.amount) : '-'
      },
    },
    { key: 'dishonorDate', title: '拒付日期', dataIndex: 'dishonorDate' },
    { key: 'reasonCode', title: '拒付代码', dataIndex: 'reasonCode' },
    { key: 'reason', title: '拒付理由', dataIndex: 'reason' },
    {
      key: 'recourseStatus',
      title: '追索状态',
      dataIndex: 'recourseStatus',
      render: (v) => {
        const map: Record<string, { label: string; color: string }> = {
          none: { label: '未追索', color: 'default' },
          in_progress: { label: '追索中', color: 'warning' },
          completed: { label: '追索完成', color: 'success' },
          failed: { label: '追索失败', color: 'danger' },
        }
        const item = map[v]
        return <Tag variant={item.color as any}>{item.label}</Tag>
      },
    },
    {
      key: 'action',
      title: '操作',
      width: 180,
      render: (_, record) => (
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedDishonor(record)
              setShowRecourseModal(true)
            }}
          >
            更新追索
          </Button>
        </div>
      ),
    },
  ]

  const trajectoryColumns: Column<DisposalRecord>[] = [
    { key: 'createdAt', title: '操作时间', dataIndex: 'createdAt', width: 170 },
    {
      key: 'type',
      title: '操作类型',
      dataIndex: 'type',
      render: (v) => {
        const item = getDisposalTypeLabel(v)
        return <Tag variant={item.color as any}>{item.label}</Tag>
      },
    },
    { key: 'billNo', title: '票据号码', dataIndex: 'billNo', render: (v) => <span className="font-mono text-xs">{v}</span> },
    { key: 'action', title: '操作内容', dataIndex: 'action' },
    {
      key: 'operator',
      title: '操作人',
      render: (_, record) => (
        <div>
          <div>{record.operatorName}</div>
          <div className="text-[11px] text-[var(--color-text-muted)]">
            {record.operatorRole === 'operation' ? '运营岗' : record.operatorRole === 'risk' ? '风险岗' : '管理员'}
          </div>
        </div>
      ),
    },
    { key: 'ipAddress', title: 'IP地址', dataIndex: 'ipAddress',
      render: (v) => <span className="text-[var(--color-text-muted)] font-mono text-xs">{v}</span> },
    {
      key: 'detail',
      title: '操作',
      width: 120,
      render: (_, record) => (
        <Button
          variant="ghost"
          size="sm"
          icon={<ChevronRight size={14} />}
          onClick={() => {
            const bill = bills.find((b) => b.billNo === record.billNo)
            if (bill) {
              setTrajectoryBill(bill)
              setShowTrajectoryModal(true)
            }
          }}
        >
          查看轨迹
        </Button>
      ),
    },
  ]

  const billTrajectory = trajectoryBill
    ? disposalRecords.filter((r) => r.billNo === trajectoryBill.billNo)
    : []

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="grid grid-cols-4 gap-3">
        <StatCard title="待反馈提示付款" value={pendingFeedbackCount} icon={Send} iconColor="warning" />
        <StatCard title="累计拒付" value={dishonoredCount} icon={XCircle} iconColor="danger" />
        <StatCard title="追索中" value={inRecourseCount} icon={RefreshCw} iconColor="warning" />
        <StatCard title="追索完成" value={completedRecourseCount} icon={CheckCircle2} iconColor="success" />
      </div>

      <Card className="flex-1 min-h-0" bodyClassName="h-full flex flex-col" padding="none">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <div className="flex gap-1">
            <Button
              variant={tab === 'prompts' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => { setTab('prompts'); setStatusFilter('all') }}
            >
              <Send size={14} className="mr-1" />
              提示付款登记
              {pendingFeedbackCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded bg-[var(--color-danger)] text-white text-[10px]">
                  {pendingFeedbackCount}
                </span>
              )}
            </Button>
            <Button
              variant={tab === 'dishonors' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => { setTab('dishonors'); setStatusFilter('all') }}
            >
              <XCircle size={14} className="mr-1" />
              拒付与追索
            </Button>
            <Button
              variant={tab === 'trajectory' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => { setTab('trajectory'); setStatusFilter('all') }}
            >
              <FileText size={14} className="mr-1" />
              完整处置轨迹
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder={
                tab === 'prompts' ? '搜索票据号、承兑人...' :
                tab === 'dishonors' ? '搜索票据号、拒付理由...' :
                '搜索票据号、操作内容、操作人...'
              }
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-64"
              prefix={<Search size={14} />}
            />
            {tab === 'prompts' && (
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: '全部状态' },
                  { value: 'no_feedback', label: '待反馈' },
                  { value: 'paid', label: '已付款' },
                  { value: 'dishonored', label: '已拒付' },
                  { value: 'pending', label: '处理中' },
                  { value: 'partial', label: '部分付款' },
                ]}
              />
            )}
            {tab === 'dishonors' && (
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: '全部状态' },
                  { value: 'none', label: '未追索' },
                  { value: 'in_progress', label: '追索中' },
                  { value: 'completed', label: '追索完成' },
                  { value: 'failed', label: '追索失败' },
                ]}
              />
            )}
            <Button variant="ghost" size="sm" icon={<Filter size={14} />}>筛选</Button>
            <Button variant="outline" size="sm" icon={<Download size={14} />}>导出</Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto min-h-0 p-4">
          {tab === 'prompts' && (
            <Table columns={promptColumns} data={filteredPrompts} />
          )}
          {tab === 'dishonors' && (
            <Table columns={dishonorColumns} data={filteredDishonors} />
          )}
          {tab === 'trajectory' && (
            <Table columns={trajectoryColumns} data={filteredTrajectory} />
          )}
        </div>
      </Card>

      <Modal
        open={showPromptModal}
        title="发起提示付款"
        width={450}
        onClose={() => setShowPromptModal(false)}
        onOk={handlePromptSubmit}
        okText="确认发起"
      >
        <div className="space-y-4">
          {selectedBill && (
            <div className="p-3 bg-[var(--color-bg-tertiary)] rounded text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">票据号码</span>
                <span className="font-mono">{selectedBill.billNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">票面金额</span>
                <span className="font-medium">{formatAmountFull(selectedBill.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">到期日期</span>
                <span>{selectedBill.dueDate}</span>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1.5">
              提示方式 <span className="text-[var(--color-danger)]">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['bank', 'system', 'manual'] as const).map((m) => (
                <button
                  key={m}
                  className={`py-2.5 px-3 rounded border text-sm transition-colors ${
                    promptMethod === m
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-white border-[var(--color-border)] hover:border-[var(--color-primary)]'
                  }`}
                  onClick={() => setPromptMethod(m)}
                >
                  {m === 'bank' ? '银行渠道' : m === 'system' ? '系统自动' : '人工操作'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={showFeedbackModal}
        title="登记付款反馈"
        width={500}
        onClose={() => setShowFeedbackModal(false)}
        onOk={handleFeedbackSubmit}
        okText="确认登记"
      >
        <div className="space-y-4">
          {selectedPrompt && (
            <div className="p-3 bg-[var(--color-bg-tertiary)] rounded text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">提示日期</span>
                <span>{selectedPrompt.promptDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">提示方式</span>
                <span>
                  {selectedPrompt.promptMethod === 'bank' ? '银行渠道' :
                    selectedPrompt.promptMethod === 'system' ? '系统自动' : '人工操作'}
                </span>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1.5">
              反馈状态 <span className="text-[var(--color-danger)]">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {([
                { v: 'paid', l: '已付款' },
                { v: 'partial', l: '部分付款' },
                { v: 'pending', l: '处理中' },
                { v: 'dishonored', l: '已拒付' },
              ] as const).map((item) => (
                <button
                  key={item.v}
                  className={`py-2 rounded border text-sm transition-colors ${
                    feedbackStatus === item.v
                      ? (item.v === 'dishonored' ? 'bg-[var(--color-danger)] text-white border-[var(--color-danger)]'
                        : item.v === 'paid' ? 'bg-[var(--color-success)] text-white border-[var(--color-success)]'
                        : 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]')
                      : 'bg-white border-[var(--color-border)] hover:border-[var(--color-primary)]'
                  }`}
                  onClick={() => setFeedbackStatus(item.v)}
                >
                  {item.l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1.5">
              反馈金额（元）
            </label>
            <Input
              type="number"
              placeholder="请输入实际付款金额"
              value={feedbackAmount}
              onChange={(e) => setFeedbackAmount(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1.5">
              备注说明
            </label>
            <TextArea
              rows={3}
              placeholder="承兑人反馈情况、特殊说明等..."
              value={feedbackNote}
              onChange={(e) => setFeedbackNote(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={showDishonorModal}
        title="登记拒付记录"
        width={500}
        onClose={() => setShowDishonorModal(false)}
        onOk={handleDishonorSubmit}
        okText="确认登记"
      >
        <div className="space-y-4">
          {selectedBill && (
            <div className="p-3 bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)] rounded text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">票据号码</span>
                <span className="font-mono">{selectedBill.billNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">承兑人</span>
                <span>{selectedBill.acceptorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">票面金额</span>
                <span className="font-medium">{formatAmountFull(selectedBill.amount)}</span>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1.5">
              拒付代码 <span className="text-[var(--color-danger)]">*</span>
            </label>
            <Select
              value={dishonorCode}
              onChange={(e) => setDishonorCode(e.target.value)}
              className="w-full"
              options={dishonorOptions}
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1.5">
              拒付理由详情 <span className="text-[var(--color-danger)]">*</span>
            </label>
            <TextArea
              rows={3}
              placeholder="请详细描述拒付原因，如银行回复内容、联系情况等..."
              value={dishonorReason}
              onChange={(e) => setDishonorReason(e.target.value)}
            />
          </div>
          <div className="p-3 bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)] rounded text-xs text-[var(--color-warning)]">
            <AlertTriangle size={14} className="inline mr-1" />
            拒付记录登记后将自动变更票据状态，并启动追索流程建议
          </div>
        </div>
      </Modal>

      <Modal
        open={showRecourseModal}
        title="更新追索状态"
        width={500}
        onClose={() => setShowRecourseModal(false)}
        onOk={handleRecourseSubmit}
        okText="确认更新"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1.5">
              追索状态 <span className="text-[var(--color-danger)]">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {([
                { v: 'none', l: '未追索' },
                { v: 'in_progress', l: '追索中' },
                { v: 'completed', l: '已完成' },
                { v: 'failed', l: '追索失败' },
              ] as const).map((item) => (
                <button
                  key={item.v}
                  className={`py-2 rounded border text-sm transition-colors ${
                    recourseStatus === item.v
                      ? (item.v === 'completed' ? 'bg-[var(--color-success)] text-white border-[var(--color-success)]'
                        : item.v === 'failed' ? 'bg-[var(--color-danger)] text-white border-[var(--color-danger)]'
                        : item.v === 'in_progress' ? 'bg-[var(--color-warning)] text-white border-[var(--color-warning)]'
                        : 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]')
                      : 'bg-white border-[var(--color-border)] hover:border-[var(--color-primary)]'
                  }`}
                  onClick={() => setRecourseStatus(item.v)}
                >
                  {item.l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1.5">
              追索回款金额（元）
            </label>
            <Input
              type="number"
              placeholder="请输入实际回款金额"
              value={recourseAmount}
              onChange={(e) => setRecourseAmount(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1.5">
              追索情况说明
            </label>
            <TextArea
              rows={3}
              placeholder="请描述追索过程、联系前手情况、回款进度等..."
              value={recourseNote}
              onChange={(e) => setRecourseNote(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={showTrajectoryModal}
        title={`票据处置轨迹${trajectoryBill ? ` - ${trajectoryBill.billNo}` : ''}`}
        width={700}
        onClose={() => setShowTrajectoryModal(false)}
        footer={
          <div className="flex justify-between w-full">
            <div className="text-xs text-[var(--color-text-muted)] self-center">
              <Clock size={12} className="inline mr-1" />
              所有操作永久留痕，可供内控抽查
            </div>
            <Button variant="secondary" onClick={() => setShowTrajectoryModal(false)}>关闭</Button>
          </div>
        }
      >
        {trajectoryBill && (
          <div className="space-y-4">
            <div className="p-3 bg-[var(--color-bg-tertiary)] rounded text-sm grid grid-cols-2 gap-2">
              <div><span className="text-[var(--color-text-muted)]">票据号码：</span><span className="font-mono">{trajectoryBill.billNo}</span></div>
              <div><span className="text-[var(--color-text-muted)]">票面金额：</span>{formatAmountFull(trajectoryBill.amount)}</div>
              <div><span className="text-[var(--color-text-muted)]">承兑人：</span>{trajectoryBill.acceptorName}</div>
              <div><span className="text-[var(--color-text-muted)]">当前状态：</span>{getStatusLabel(trajectoryBill.status)}</div>
            </div>

            <div className="relative pl-6">
              <div className="absolute left-2.5 top-1 bottom-1 w-px bg-[var(--color-border)]" />
              {billTrajectory.map((record, idx) => {
                const typeInfo = getDisposalTypeLabel(record.type)
                return (
                  <div key={record.id} className="relative pb-5 last:pb-0">
                    <div className={`absolute -left-3.5 top-1 w-3 h-3 rounded-full border-2 ${
                      idx === 0 ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                        : 'bg-white border-[var(--color-border-dark)]'
                    }`} />
                    <div className="bg-white border border-[var(--color-border)] rounded p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Tag variant={typeInfo.color as any}>{typeInfo.label}</Tag>
                          <span className="text-sm font-medium">{record.action}</span>
                        </div>
                        <span className="text-xs text-[var(--color-text-muted)]">{record.createdAt}</span>
                      </div>
                      {record.detail && (
                        <div className="text-sm text-[var(--color-text-secondary)] mb-2">{record.detail}</div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                        <span>操作人：{record.operatorName}
                          （{record.operatorRole === 'operation' ? '运营岗' : record.operatorRole === 'risk' ? '风险岗' : '管理员'}）
                        </span>
                        <span className="font-mono">IP: {record.ipAddress}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              {billTrajectory.length === 0 && (
                <div className="text-center text-[var(--color-text-muted)] py-8">暂无处置记录</div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
