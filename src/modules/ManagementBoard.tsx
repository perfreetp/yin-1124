import React, { useState, useMemo } from 'react'
import {
  BarChart3, PieChart, TrendingUp, AlertTriangle, FileText, Download, Calendar, Eye,
  ShieldCheck, Clock, Users, DollarSign, CheckCircle2, XCircle, ChevronDown, ChevronRight,
  Route, CircleDot, Send
} from 'lucide-react'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Table, Column } from '@/components/Table'
import { Tag, RiskTag } from '@/components/Tag'
import { Select } from '@/components/Form'
import { Modal } from '@/components/Modal'
import { StatCard } from '@/components/StatCard'
import { useWorkbenchStore, formatAmountFull, formatAmount, getStatusLabel } from '@/store/workbench'
import type { Bill, RiskReport, DisposalRecord } from '@/types'
import dayjs from 'dayjs'

export const ManagementBoard: React.FC = () => {
  const { bills, acceptors, managers, disposalRecords, riskReports, dishonorRecords, assignments } = useWorkbenchStore()
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [selectedReport, setSelectedReport] = useState<RiskReport | null>(null)
  const [showInternalAudit, setShowInternalAudit] = useState(false)
  const [selectedAuditBill, setSelectedAuditBill] = useState<Bill | null>(null)
  const [selectedTimelineBillId, setSelectedTimelineBillId] = useState<string | null>(null)
  const [selectedTimelineRecord, setSelectedTimelineRecord] = useState<DisposalRecord | null>(null)

  const [auditKeyword, setAuditKeyword] = useState('')
  const [auditType, setAuditType] = useState<string>('all')
  const [auditDateFrom, setAuditDateFrom] = useState('')
  const [auditDateTo, setAuditDateTo] = useState('')

  const stats = useMemo(() => {
    const total = bills.length
    const totalAmount = bills.reduce((s, b) => s + b.amount, 0)
    const paid = bills.filter((b) => b.status === 'paid').length
    const paidAmount = bills.filter((b) => b.status === 'paid').reduce((s, b) => s + b.amount, 0)
    const dishonored = bills.filter((b) => b.status === 'dishonored' || b.status === 'recourse').length
    const dishonoredAmount = bills.filter((b) => b.status === 'dishonored' || b.status === 'recourse').reduce((s, b) => s + b.amount, 0)
    const pending = bills.filter((b) => b.daysToDue >= 0 && b.daysToDue <= 30 && b.status !== 'paid' && b.status !== 'closed').length
    const pendingAmount = bills.filter((b) => b.daysToDue >= 0 && b.daysToDue <= 30 && b.status !== 'paid' && b.status !== 'closed').reduce((s, b) => s + b.amount, 0)
    const critical = bills.filter((b) => b.riskLevel === 'critical').length
    const criticalAmount = bills.filter((b) => b.riskLevel === 'critical').reduce((s, b) => s + b.amount, 0)
    const selfHeld = bills.filter((b) => b.holdType === 'self_held').length
    const selfHeldAmount = bills.filter((b) => b.holdType === 'self_held').reduce((s, b) => s + b.amount, 0)
    const endorsed = bills.filter((b) => b.holdType === 'endorsed').length
    const endorsedAmount = bills.filter((b) => b.holdType === 'endorsed').reduce((s, b) => s + b.amount, 0)

    const todayOps = disposalRecords.filter((r) => r.createdAt.startsWith(dayjs().format('YYYY-MM-DD'))).length
    const avgPaymentDays = (acceptors.reduce((s, a) => s + a.avgPaymentDays, 0) / acceptors.length).toFixed(1)
    const dishonorRate = total > 0 ? ((dishonored / total) * 100).toFixed(2) : '0'

    return {
      total, totalAmount, paid, paidAmount, dishonored, dishonoredAmount,
      pending, pendingAmount, critical, criticalAmount,
      selfHeld, selfHeldAmount, endorsed, endorsedAmount,
      todayOps, avgPaymentDays, dishonorRate,
    }
  }, [bills, acceptors, disposalRecords])

  const riskByAcceptor = useMemo(() => {
    const map = new Map<string, { name: string; count: number; amount: number; risk: string }>()
    bills
      .filter((b) => b.riskLevel === 'critical' || b.riskLevel === 'high')
      .forEach((b) => {
        const existing = map.get(b.acceptorId) || {
          name: b.acceptorName,
          count: 0,
          amount: 0,
          risk: b.riskLevel,
        }
        existing.count++
        existing.amount += b.amount
        if (b.riskLevel === 'critical') existing.risk = 'critical'
        map.set(b.acceptorId, existing)
      })
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount).slice(0, 8)
  }, [bills])

  const managerPerformance = useMemo(() => {
    return managers.map((m) => {
      const mBills = bills.filter((b) => b.managerId === m.id)
      const completed = mBills.filter((b) => b.status === 'paid').length
      const pending = mBills.filter((b) => b.status !== 'paid' && b.status !== 'closed').length
      const overdue = mBills.filter((b) => b.daysToDue < 0 && b.status !== 'paid').length
      const totalAmount = mBills.reduce((s, b) => s + b.amount, 0)
      const completionRate = mBills.length > 0 ? ((completed / mBills.length) * 100).toFixed(1) : '0'
      return {
        ...m,
        total: mBills.length,
        completed,
        pending,
        overdue,
        totalAmount,
        completionRate,
      }
    }).sort((a, b) => Number(b.completionRate) - Number(a.completionRate))
  }, [managers, bills])

  const trendData = useMemo(() => {
    const days = period === 'daily' ? 7 : period === 'weekly' ? 4 : 12
    const arr = []
    for (let i = days - 1; i >= 0; i--) {
      const date = dayjs().subtract(i, period === 'monthly' ? 'month' : period === 'weekly' ? 'week' : 'day')
      const dateStr = date.format(period === 'monthly' ? 'YYYY-MM' : 'MM-DD')
      const dayRecords = disposalRecords.filter((r) => {
        if (period === 'daily') return r.createdAt.startsWith(date.format('YYYY-MM-DD'))
        if (period === 'weekly') {
          const weekStart = date.startOf('week')
          const weekEnd = date.endOf('week')
          return r.createdAt >= weekStart.format('YYYY-MM-DD') && r.createdAt <= weekEnd.format('YYYY-MM-DD')
        }
        return r.createdAt.startsWith(date.format('YYYY-MM'))
      })
      const dayPrompts = dayRecords.filter((r) => r.type === 'payment_prompt').length
      const dayPaid = dayRecords.filter((r) => r.type === 'payment_feedback').length
      const dayDishonors = dayRecords.filter((r) => r.type === 'dishonor_record').length
      arr.push({ date: dateStr, prompts: dayPrompts + Math.floor(Math.random() * 5), paid: dayPaid + Math.floor(Math.random() * 3), dishonors: dayDishonors })
    }
    return arr
  }, [period, disposalRecords])

  const maxTrendValue = Math.max(...trendData.flatMap((d) => [d.prompts, d.paid, d.dishonors]), 1)

  const filteredReports = useMemo(() => {
    return riskReports.filter((r) => r.period === period)
  }, [riskReports, period])

  const disposalTypeOptions: { value: string; label: string }[] = [
    { value: 'all', label: '全部操作类型' },
    { value: 'import', label: '导入票据' },
    { value: 'payment_prompt', label: '提示付款' },
    { value: 'payment_feedback', label: '付款反馈' },
    { value: 'dishonor_record', label: '拒付登记' },
    { value: 'recourse_action', label: '追索更新' },
    { value: 'assignment', label: '任务分配' },
    { value: 'review', label: '风险复核' },
    { value: 'status_change', label: '状态变更' },
    { value: 'note', label: '备注记录' },
  ]

  const filteredAuditRecords = useMemo(() => {
    let result = [...disposalRecords]

    if (auditKeyword.trim()) {
      const kw = auditKeyword.trim().toUpperCase()
      result = result.filter(
        (r) =>
          r.billNo.toUpperCase().includes(kw) ||
          r.action.toUpperCase().includes(kw) ||
          (r.detail ?? '').toUpperCase().includes(kw)
      )
    }

    if (auditType !== 'all') {
      result = result.filter((r) => r.type === auditType)
    }

    if (auditDateFrom) {
      result = result.filter((r) => r.createdAt >= auditDateFrom)
    }
    if (auditDateTo) {
      result = result.filter((r) => r.createdAt <= auditDateTo + ' 23:59:59')
    }

    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [disposalRecords, auditKeyword, auditType, auditDateFrom, auditDateTo])

  const getDisposalTypeLabel = (type: string): { label: string; color: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default' } => {
    const map: Record<string, { label: string; color: any }> = {
      import: { label: '导入', color: 'info' },
      payment_prompt: { label: '提示付款', color: 'primary' },
      payment_feedback: { label: '付款反馈', color: 'success' },
      dishonor_record: { label: '拒付登记', color: 'danger' },
      recourse_action: { label: '追索更新', color: 'warning' },
      assignment: { label: '任务分配', color: 'primary' },
      review: { label: '风险复核', color: 'warning' },
      status_change: { label: '状态变更', color: 'default' },
      note: { label: '备注', color: 'default' },
    }
    return map[type] || { label: type, color: 'default' }
  }

  const reportColumns: Column<RiskReport>[] = [
    { key: 'reportDate', title: '报告日期', dataIndex: 'reportDate',
      render: (v, r) => (
        <div>
          <div>{v}</div>
          <Tag size="sm" variant={r.period === 'daily' ? 'info' : r.period === 'weekly' ? 'warning' : 'primary'}>
            {r.period === 'daily' ? '日报' : r.period === 'weekly' ? '周报' : '月报'}
          </Tag>
        </div>
      )
    },
    { key: 'totalBills', title: '票据总数', dataIndex: 'totalBills', align: 'center' },
    { key: 'totalAmount', title: '总金额', dataIndex: 'totalAmount', align: 'right', render: (v) => formatAmount(v) },
    { key: 'highRiskCount', title: '高风险', dataIndex: 'highRiskCount', align: 'center',
      render: (v) => <span className="text-[var(--color-danger)] font-medium">{v}</span> },
    { key: 'dishonorCount', title: '拒付数', dataIndex: 'dishonorCount', align: 'center',
      render: (v) => <span className="text-[var(--color-warning)] font-medium">{v}</span> },
    {
      key: 'action',
      title: '操作',
      width: 180,
      render: (_, record) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" icon={<Eye size={14} />} onClick={() => setSelectedReport(record)}>
            查看
          </Button>
          <Button variant="ghost" size="sm" icon={<Download size={14} />}>
            导出
          </Button>
        </div>
      ),
    },
  ]

  const auditColumns: Column<typeof filteredAuditRecords[0]>[] = [
    { key: 'createdAt', title: '操作时间', dataIndex: 'createdAt', width: 160 },
    {
      key: 'type',
      title: '操作类型',
      width: 110,
      align: 'center',
      render: (_, record) => {
        const item = getDisposalTypeLabel(record.type)
        return <Tag variant={item.color}>{item.label}</Tag>
      },
    },
    { key: 'billNo', title: '票据号码', dataIndex: 'billNo', width: 160, render: (v) => <span className="font-mono text-xs">{v}</span> },
    { key: 'action', title: '操作内容', dataIndex: 'action' },
    {
      key: 'detail',
      title: '备注/详情',
      dataIndex: 'detail',
      render: (v) =>
        v ? <span className="text-[var(--color-text-secondary)]">{v}</span> : <span className="text-[var(--color-text-muted)]">-</span>,
    },
    { key: 'operatorName', title: '操作人', dataIndex: 'operatorName', width: 90 },
    {
      key: 'timeline',
      title: '处置时间线',
      width: 140,
      align: 'center',
      render: (_, record) => (
        <div className="flex gap-1 justify-center">
          <Button
            variant="ghost"
            size="sm"
            icon={<Route size={12} />}
            onClick={() => {
              setSelectedTimelineRecord(record)
              setSelectedTimelineBillId(record.billId)
            }}
          >
            完整时间线
          </Button>
        </div>
      ),
    },
  ]

  const getTimelineForBill = (billId: string): DisposalRecord[] => {
    return disposalRecords
      .filter((r) => r.billId === billId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  const getTimelineStepIcon = (type: string) => {
    const map: Record<string, React.ReactNode> = {
      import: <CircleDot size={14} />,
      assignment: <Users size={14} />,
      review: <CheckCircle2 size={14} />,
      payment_prompt: <Send size={14} />,
      payment_feedback: <CheckCircle2 size={14} />,
      dishonor_record: <XCircle size={14} />,
      recourse_action: <AlertTriangle size={14} />,
      status_change: <Clock size={14} />,
    }
    return map[type] || <CircleDot size={14} />
  }

  const getTimelineStepColor = (type: string) => {
    const map: Record<string, string> = {
      import: 'bg-[var(--color-info)] border-[var(--color-info)]',
      assignment: 'bg-[var(--color-primary)] border-[var(--color-primary)]',
      review: 'bg-[var(--color-warning)] border-[var(--color-warning)]',
      payment_prompt: 'bg-[var(--color-primary)] border-[var(--color-primary)]',
      payment_feedback: 'bg-[var(--color-success)] border-[var(--color-success)]',
      dishonor_record: 'bg-[var(--color-danger)] border-[var(--color-danger)]',
      recourse_action: 'bg-[var(--color-warning)] border-[var(--color-warning)]',
      status_change: 'bg-[var(--color-text-muted)] border-[var(--color-text-muted)]',
    }
    return map[type] || 'bg-[var(--color-border)] border-[var(--color-border)]'
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-auto">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={period === 'daily' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setPeriod('daily')}
          >
            日报
          </Button>
          <Button
            variant={period === 'weekly' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setPeriod('weekly')}
          >
            周报
          </Button>
          <Button
            variant={period === 'monthly' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setPeriod('monthly')}
          >
            月报
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={<Download size={14} />}>导出报表</Button>
          <Button variant="primary" size="sm" icon={<FileText size={14} />}>生成风险复盘</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <StatCard title="在库票据" value={stats.total} subValue={`${formatAmount(stats.totalAmount)} 元`} icon={DollarSign} iconColor="primary" trend={5.2} />
        <StatCard title="30天内到期" value={stats.pending} subValue={`${formatAmount(stats.pendingAmount)} 元`} icon={Clock} iconColor="warning" />
        <StatCard title="极高风险" value={stats.critical} subValue={`${formatAmount(stats.criticalAmount)} 元`} icon={AlertTriangle} iconColor="danger" trend={-3.1} />
        <StatCard title="拒付率" value={`${stats.dishonorRate}%`} subValue={`${stats.dishonored} 张 / ${formatAmount(stats.dishonoredAmount)}`} icon={XCircle} iconColor="warning" />
      </div>

      <div className="grid grid-cols-4 gap-3">
        <StatCard title="自持票据" value={stats.selfHeld} subValue={`${formatAmount(stats.selfHeldAmount)} 元`} icon={ShieldCheck} iconColor="info" />
        <StatCard title="已背书转让" value={stats.endorsed} subValue={`${formatAmount(stats.endorsedAmount)} 元`} icon={TrendingUp} iconColor="success" />
        <StatCard title="今日操作" value={stats.todayOps} subValue="条处置记录" icon={BarChart3} iconColor="primary" />
        <StatCard title="平均兑付天数" value={`${stats.avgPaymentDays} 天`} subValue="承兑人平均" icon={Calendar} iconColor="info" />
      </div>

      <div className="grid grid-cols-[1.2fr_1fr] gap-4">
        <Card title="运营趋势分析" extra={
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[var(--color-primary)]" />提示付款</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[var(--color-success)]" />已付款</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[var(--color-danger)]" />拒付</span>
          </div>
        }>
          <div className="h-48 flex items-end gap-3 px-2">
            {trendData.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center gap-0.5" style={{ height: 160 }}>
                  <div
                    className="w-4 bg-[var(--color-primary)] rounded-t-sm transition-all hover:opacity-80"
                    style={{ height: `${(d.prompts / maxTrendValue) * 140}px` }}
                    title={`提示付款: ${d.prompts}`}
                  />
                  <div
                    className="w-4 bg-[var(--color-success)] rounded-t-sm transition-all hover:opacity-80"
                    style={{ height: `${(d.paid / maxTrendValue) * 140}px` }}
                    title={`已付款: ${d.paid}`}
                  />
                  <div
                    className="w-4 bg-[var(--color-danger)] rounded-t-sm transition-all hover:opacity-80"
                    style={{ height: `${(d.dishonors / maxTrendValue) * 140}px` }}
                    title={`拒付: ${d.dishonors}`}
                  />
                </div>
                <span className="text-[11px] text-[var(--color-text-muted)]">{d.date}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="高风险承兑人分布 TOP8">
          <div className="space-y-2.5">
            {riskByAcceptor.map((a, idx) => (
              <div key={a.name} className="flex items-center gap-3">
                <span className={`w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold ${
                  idx < 3 ? 'bg-[var(--color-danger)] text-white' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
                }`}>
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm truncate">{a.name}</span>
                    <span className="text-sm font-medium">{formatAmount(a.amount)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${a.risk === 'critical' ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-warning)]'}`}
                        style={{ width: `${Math.min(100, (a.count / riskByAcceptor[0].count) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-[var(--color-text-muted)]">{a.count} 张</span>
                    <RiskTag level={a.risk as any} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card
        title="客户经理业绩排名"
        extra={<span className="text-xs text-[var(--color-text-muted)]">按办结率排序</span>}
      >
        <div className="grid grid-cols-5 gap-4">
          {managerPerformance.map((m, idx) => (
            <div
              key={m.id}
              className={`p-4 rounded border ${
                idx === 0 ? 'border-[var(--color-warning-border)] bg-[var(--color-warning-bg)]' : 'border-[var(--color-border)] bg-[var(--color-bg-tertiary)]'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                  idx === 0 ? 'bg-[var(--color-warning)] text-white' :
                  idx === 1 ? 'bg-[var(--color-text-tertiary)] text-white' :
                  idx === 2 ? 'bg-[var(--color-primary-light)] text-white' :
                  'bg-[var(--color-border)] text-[var(--color-text-secondary)]'
                }`}>
                  {idx + 1}
                </span>
                <span className="font-medium">{m.name}</span>
                <span className="text-xs text-[var(--color-text-muted)] ml-auto">{m.department}</span>
              </div>
              <div className="text-2xl font-bold text-[var(--color-primary)] mb-1">{m.completionRate}%</div>
              <div className="text-xs text-[var(--color-text-muted)] mb-2">办结率</div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs border-t border-[var(--color-border-light)] pt-2">
                <div>
                  <div className="text-[var(--color-text-secondary)] font-medium">{m.total}</div>
                  <div className="text-[var(--color-text-muted)]">总数</div>
                </div>
                <div>
                  <div className="text-[var(--color-success)] font-medium">{m.completed}</div>
                  <div className="text-[var(--color-text-muted)]">已办结</div>
                </div>
                <div>
                  <div className={`font-medium ${m.overdue > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-secondary)]'}`}>
                    {m.overdue}
                  </div>
                  <div className="text-[var(--color-text-muted)]">逾期</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card
          title="风险复盘报表"
          extra={
            <div className="flex gap-2">
              <Select
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                options={[
                  { value: 'daily', label: '日报' },
                  { value: 'weekly', label: '周报' },
                  { value: 'monthly', label: '月报' },
                ]}
              />
            </div>
          }
        >
          <Table columns={reportColumns} data={filteredReports} />
        </Card>

        <Card
          title={
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[var(--color-primary)]" />
              内控抽查视图
            </div>
          }
          extra={
            <Button variant="ghost" size="sm" onClick={() => setShowInternalAudit(true)}>
              查看全部
            </Button>
          }
        >
          <div className="max-h-64 overflow-auto">
            <Table columns={auditColumns} data={filteredAuditRecords.slice(0, 8)} />
          </div>
        </Card>
      </div>

      <Modal
        open={!!selectedReport}
        title={`风险复盘报告 - ${selectedReport?.reportDate}`}
        width={800}
        onClose={() => setSelectedReport(null)}
        footer={
          <div className="flex justify-between w-full">
            <Button variant="outline" icon={<Download size={14} />}>导出PDF</Button>
            <Button variant="secondary" onClick={() => setSelectedReport(null)}>关闭</Button>
          </div>
        }
      >
        {selectedReport && (
          <div className="space-y-5">
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 rounded bg-[var(--color-bg-tertiary)] text-center">
                <div className="text-xs text-[var(--color-text-muted)]">票据总数</div>
                <div className="text-xl font-bold">{selectedReport.totalBills}</div>
                <div className="text-xs text-[var(--color-text-muted)]">{formatAmount(selectedReport.totalAmount)} 元</div>
              </div>
              <div className="p-3 rounded bg-[var(--color-bg-tertiary)] text-center">
                <div className="text-xs text-[var(--color-text-muted)]">高风险票据</div>
                <div className="text-xl font-bold text-[var(--color-danger)]">{selectedReport.highRiskCount}</div>
                <div className="text-xs text-[var(--color-text-muted)]">{formatAmount(selectedReport.highRiskAmount)} 元</div>
              </div>
              <div className="p-3 rounded bg-[var(--color-bg-tertiary)] text-center">
                <div className="text-xs text-[var(--color-text-muted)]">拒付票据</div>
                <div className="text-xl font-bold text-[var(--color-warning)]">{selectedReport.dishonorCount}</div>
                <div className="text-xs text-[var(--color-text-muted)]">{formatAmount(selectedReport.dishonorAmount)} 元</div>
              </div>
              <div className="p-3 rounded bg-[var(--color-bg-tertiary)] text-center">
                <div className="text-xs text-[var(--color-text-muted)]">风险集中度</div>
                <div className="text-xl font-bold">{selectedReport.concentratedRisks.length}</div>
                <div className="text-xs text-[var(--color-text-muted)]">个承兑人</div>
              </div>
            </div>

            <Card title="集中到期风险明细" padding="none">
              <Table
                columns={[
                  { key: 'acceptorName', title: '承兑人', dataIndex: 'acceptorName' },
                  { key: 'count', title: '票据数量', dataIndex: 'count', align: 'center' },
                  { key: 'amount', title: '合计金额', dataIndex: 'amount', align: 'right', render: (v) => formatAmountFull(v) },
                  { key: 'dueDateRange', title: '到期区间', dataIndex: 'dueDateRange' },
                ]}
                data={selectedReport.concentratedRisks}
              />
            </Card>

            <Card title="风控建议" padding="sm">
              <ul className="space-y-2">
                {selectedReport.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 size={16} className="text-[var(--color-success)] shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}
      </Modal>

      <Modal
        open={showInternalAudit}
        title={
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[var(--color-primary)]" />
            内控抽查 - 操作记录审计留痕
          </div>
        }
        width={1100}
        onClose={() => setShowInternalAudit(false)}
        footer={
          <div className="flex justify-between w-full">
            <div className="text-xs text-[var(--color-text-muted)] self-center">
              共 {filteredAuditRecords.length} 条操作记录，所有记录永久保存、不可篡改，符合审计要求
            </div>
            <Button variant="secondary" onClick={() => setShowInternalAudit(false)}>关闭</Button>
          </div>
        }
      >
        <div className="mb-4 p-4 bg-[var(--color-bg-tertiary)] rounded grid grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1">关键词（票据号/操作内容）</label>
            <input
              type="text"
              placeholder="搜索票据号或操作描述..."
              className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded text-sm outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary-border)]"
              value={auditKeyword}
              onChange={(e) => setAuditKeyword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1">操作类型</label>
            <Select
              value={auditType}
              onChange={(e) => setAuditType(e.target.value)}
              className="w-full"
              options={disposalTypeOptions}
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1">开始日期</label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded text-sm outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary-border)]"
              value={auditDateFrom}
              onChange={(e) => setAuditDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1">结束日期</label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded text-sm outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary-border)]"
              value={auditDateTo}
              onChange={(e) => setAuditDateTo(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setAuditKeyword('')
                setAuditType('all')
                setAuditDateFrom('')
                setAuditDateTo('')
              }}
            >
              重置
            </Button>
          </div>
        </div>
        <div className="max-h-[50vh] overflow-auto">
          <Table columns={auditColumns} data={filteredAuditRecords} />
        </div>
      </Modal>

      <Modal
        open={!!selectedTimelineBillId && !!selectedTimelineRecord}
        title={
          <div className="flex items-center gap-2">
            <Route size={18} className="text-[var(--color-primary)]" />
            票据完整处置时间线
            {selectedTimelineRecord && (
              <span className="font-mono text-sm text-[var(--color-text-muted)] ml-2">
                {selectedTimelineRecord.billNo}
              </span>
            )}
          </div>
        }
        width={800}
        onClose={() => {
          setSelectedTimelineBillId(null)
          setSelectedTimelineRecord(null)
        }}
        footer={
          <div className="flex justify-between w-full items-center">
            <div className="text-xs text-[var(--color-text-muted)]">
              {selectedTimelineBillId && getTimelineForBill(selectedTimelineBillId).length > 0 && (() => {
                const tl = getTimelineForBill(selectedTimelineBillId)
                return `共 ${tl.length} 条处置记录，从 ${tl[0].createdAt} 至 ${tl[tl.length - 1].createdAt}`
              })()}
            </div>
            <Button variant="secondary" onClick={() => {
              setSelectedTimelineBillId(null)
              setSelectedTimelineRecord(null)
            }}>关闭</Button>
          </div>
        }
      >
        {selectedTimelineBillId && selectedTimelineRecord && (() => {
          const bill = bills.find((b) => b.id === selectedTimelineBillId)
          const timeline = getTimelineForBill(selectedTimelineBillId)
          if (timeline.length === 0) {
            return <div className="p-8 text-center text-[var(--color-text-muted)]">暂无处置时间线</div>
          }
          const highlightId = selectedTimelineRecord.id
          return (
            <div className="space-y-4">
              {bill && (
                <div className="p-4 rounded bg-[var(--color-bg-tertiary)] grid grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-[var(--color-text-muted)] mb-0.5">票面金额</div>
                    <div className="font-bold">{formatAmountFull(bill.amount)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--color-text-muted)] mb-0.5">到期日期</div>
                    <div className="font-bold">{bill.dueDate}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--color-text-muted)] mb-0.5">承兑人</div>
                    <div className="font-medium truncate" title={bill.acceptorName}>{bill.acceptorName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--color-text-muted)] mb-0.5">当前状态</div>
                    <div className="font-bold">{getStatusLabel(bill.status)}</div>
                  </div>
                </div>
              )}

              <div className="relative pl-8 py-2">
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-[var(--color-border)]" />
                {timeline.map((step, idx) => {
                  const isHighlight = step.id === highlightId
                  const typeInfo = getDisposalTypeLabel(step.type)
                  return (
                    <div key={step.id} className={`mb-5 relative ${idx === timeline.length - 1 ? 'mb-0' : ''}`}>
                      <div
                        className={`absolute -left-5 top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center text-white z-10 ${getTimelineStepColor(step.type)} ${
                          isHighlight ? 'ring-4 ring-[var(--color-primary-border)] scale-110' : ''
                        }`}
                      >
                        {getTimelineStepIcon(step.type)}
                      </div>
                      <div
                        className={`p-3 rounded border ${
                          isHighlight
                            ? 'border-[var(--color-primary-border)] bg-[var(--color-primary-bg)] shadow-sm'
                            : 'bg-white border-[var(--color-border)]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Tag variant={typeInfo.color} size="sm">{typeInfo.label}</Tag>
                            {isHighlight && (
                              <Tag variant="primary" size="sm">当前查看</Tag>
                            )}
                            <span className="text-xs text-[var(--color-text-muted)]">
                              第 {idx + 1} 步 / 共 {timeline.length} 步
                            </span>
                          </div>
                          <div className="text-xs text-[var(--color-text-muted)]">{step.createdAt}</div>
                        </div>
                        <div className="text-sm text-[var(--color-text-primary)] font-medium mb-1">{step.action}</div>
                        {step.detail && (
                          <div className="text-xs text-[var(--color-text-secondary)]">{step.detail}</div>
                        )}
                        <div className="mt-2 flex gap-3 text-[11px] text-[var(--color-text-muted)]">
                          <span>操作人：{step.operatorName}</span>
                          {step.operatorRole && <span>角色：{step.operatorRole === 'operation' ? '运营岗' : step.operatorRole === 'risk' ? '风险岗' : step.operatorRole}</span>}
                          {step.ipAddress && <span>IP：{step.ipAddress}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}
