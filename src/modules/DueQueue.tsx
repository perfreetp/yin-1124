  import React, { useState, useMemo } from 'react'
import { AlertTriangle, Clock, ArrowUpDown, Filter, Send, CheckCircle2, XCircle, UserPlus, Eye, ChevronRight, Lightbulb, TrendingUp } from 'lucide-react'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Table, Column } from '@/components/Table'
import { StatusTag, RiskTag, Tag } from '@/components/Tag'
import { Input, Select } from '@/components/Form'
import { Modal } from '@/components/Modal'
import { StatCard } from '@/components/StatCard'
import {
  useWorkbenchStore,
  formatAmountFull,
  formatAmount,
} from '@/store/workbench'
import type { Bill } from '@/types'

export const DueQueue: React.FC = () => {
  const {
    bills,
    acceptors,
    managers,
    selectedBillIds,
    selectedBillIds: _s,
    toggleBillSelection,
    clearBillSelection,
    selectAllBills,
    updateBillStatus,
    assignBillToManager,
    batchAssignToManager,
    markAsReviewed,
    addPaymentPrompt,
    batchAddPaymentPrompt,
  } = useWorkbenchStore()

  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')
  const [holdTypeFilter, setHoldTypeFilter] = useState('all')
  const [reviewFilter, setReviewFilter] = useState('all')
  const [sortField, setSortField] = useState<'dueDate' | 'amount' | 'risk'>('dueDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [assignModal, setAssignModal] = useState(false)
  const [selectedManager, setSelectedManager] = useState('')
  const [currentBill, setCurrentBill] = useState<Bill | null>(null)
  const [assignPriority, setAssignPriority] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [assignNote, setAssignNote] = useState('')
  const [showRiskConcentration, setShowRiskConcentration] = useState(false)
  const [showBillDetail, setShowBillDetail] = useState(false)
  const [detailBill, setDetailBill] = useState<Bill | null>(null)

  const acceptorMap = useMemo(() => {
    const map = new Map<string, typeof acceptors[0]>()
    acceptors.forEach((a) => map.set(a.name, a))
    return map
  }, [acceptors])

  const getDisposalSuggestions = (bill: Bill): { title: string; desc: string; priority: 'critical' | 'high' | 'medium' | 'low' }[] => {
    const suggestions: { title: string; desc: string; priority: 'critical' | 'high' | 'medium' | 'low' }[] = []

    if (bill.daysToDue < 0) {
      suggestions.push({
        title: '逾期未处置',
        desc: `票据已逾期 ${Math.abs(bill.daysToDue)} 天，请立即核实兑付情况并启动追索流程`,
        priority: 'critical',
      })
    } else if (bill.daysToDue <= 3) {
      suggestions.push({
        title: '临近到期，立即提示付款',
        desc: `剩余 ${bill.daysToDue} 天到期，建议今日内完成提示付款操作`,
        priority: 'critical',
      })
    } else if (bill.daysToDue <= 7) {
      suggestions.push({
        title: '本周到期，准备提示付款',
        desc: `剩余 ${bill.daysToDue} 天到期，建议本周内完成提示付款`,
        priority: 'high',
      })
    } else if (bill.daysToDue <= 15) {
      suggestions.push({
        title: '近半月到期，提前规划',
        desc: `剩余 ${bill.daysToDue} 天到期，确认客户经理是否已分配`,
        priority: 'medium',
      })
    }

    if (bill.holdType === 'endorsed') {
      suggestions.push({
        title: '已背书转让，确认追索权',
        desc: '此票据已背书转让，建议确认被背书方兑付情况，保留追索权利',
        priority: 'medium',
      })
    } else if (bill.holdType === 'self_held') {
      suggestions.push({
        title: '自持票据，按时提示',
        desc: '自持票据请按规范流程通过银行渠道提示付款，注意兑付时效',
        priority: bill.daysToDue <= 7 ? 'high' : 'low',
      })
    }

    if (bill.requiresReview && !bill.reviewed) {
      suggestions.push({
        title: '金额较大，待风险复核',
        desc: `票面金额 ${formatAmountFull(bill.amount)} 元 ≥ 500 万，需风险复核后再操作`,
        priority: 'high',
      })
    }

    if (bill.status === 'pending_payment') {
      suggestions.push({
        title: '已提示付款，等待反馈',
        desc: '请关注承兑人反馈，若超时未兑付请及时跟进并登记拒付记录',
        priority: bill.daysToDue < 0 ? 'critical' : 'high',
      })
    }

    if (bill.status === 'dishonored' || bill.status === 'recourse') {
      suggestions.push({
        title: '已拒付，跟进追索',
        desc: '请确认追索状态，及时收集拒付证明，推进法律追索流程',
        priority: 'critical',
      })
    }

    if (!bill.managerId) {
      suggestions.push({
        title: '未分配客户经理',
        desc: '建议分配跟单客户经理，明确处置责任人',
        priority: bill.daysToDue <= 7 ? 'high' : 'medium',
      })
    }

    const acc = acceptorMap.get(bill.acceptorName)
    if (acc) {
      if (acc.riskLevel === 'critical' || acc.riskLevel === 'high') {
        suggestions.push({
          title: `承兑人${acc.riskLevel === 'critical' ? '极高' : '高'}风险`,
          desc: `${acc.name} 拒付率 ${acc.dishonorRate}%，兑付表现 ${acc.performance === 'poor' ? '较差' : acc.performance === 'warning' ? '预警' : '一般'}，建议重点关注`,
          priority: 'critical',
        })
      }
      if (acc.concentratedDueCount && acc.concentratedDueCount >= 3) {
        suggestions.push({
          title: '承兑人集中到期',
          desc: `${acc.concentratedDueDate} 前后该承兑人有 ${acc.concentratedDueCount} 张票据集中到期，警惕流动性风险`,
          priority: 'high',
        })
      }
    }

    return suggestions.sort((a, b) => {
      const map: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
      return map[b.priority] - map[a.priority]
    })
  }

  const getRankingReasons = (bill: Bill): string[] => {
    const reasons: string[] = []

    if (bill.daysToDue < 0) reasons.push(`逾期 ${Math.abs(bill.daysToDue)} 天`)
    else if (bill.daysToDue <= 3) reasons.push(`剩余 ${bill.daysToDue} 天到期（紧急）`)
    else if (bill.daysToDue <= 7) reasons.push(`剩余 ${bill.daysToDue} 天到期（本周）`)

    if (bill.riskLevel === 'critical') reasons.push('极高风险等级')
    else if (bill.riskLevel === 'high') reasons.push('高风险等级')

    if (bill.amount >= 10000000) reasons.push(`票面金额 ${formatAmount(bill.amount)} 元（大额）`)
    else if (bill.requiresReview) reasons.push(`票面金额 ≥ 500 万（待复核）`)

    if (bill.status === 'dishonored') reasons.push('已拒付')
    if (bill.status === 'recourse') reasons.push('追索中')
    if (bill.status === 'pending_payment') reasons.push('待付款反馈')

    const acc = acceptorMap.get(bill.acceptorName)
    if (acc) {
      if (acc.dishonorRate >= 5) reasons.push(`承兑人拒付率 ${acc.dishonorRate}%`)
      if (acc.concentratedDueCount && acc.concentratedDueCount >= 3) reasons.push('承兑人集中到期')
    }

    return reasons.length > 0 ? reasons : ['正常待处置']
  }

  const filteredBills = useMemo(() => {
    let result = [...bills]
    if (keyword) {
      const kw = keyword.toLowerCase()
      result = result.filter(
        (b) =>
          b.billNo.toLowerCase().includes(kw) ||
          b.acceptorName.toLowerCase().includes(kw) ||
          b.drawer.toLowerCase().includes(kw) ||
          (b.managerName?.toLowerCase().includes(kw))
      )
    }
    if (statusFilter !== 'all') {
      result = result.filter((b) => b.status === statusFilter)
    }
    if (riskFilter !== 'all') {
      result = result.filter((b) => b.riskLevel === riskFilter)
    }
    if (holdTypeFilter !== 'all') {
      result = result.filter((b) => b.holdType === holdTypeFilter)
    }
    if (reviewFilter !== 'all') {
      if (reviewFilter === 'pending') {
        result = result.filter((b) => b.requiresReview && !b.reviewed)
      } else if (reviewFilter === 'approved') {
        result = result.filter((b) => b.requiresReview && b.reviewStatus === 'approved')
      }
    }

    result.sort((a, b) => {
      let va: any, vb: any
      if (sortField === 'dueDate') {
        va = a.daysToDue
        vb = b.daysToDue
      } else if (sortField === 'amount') {
        va = a.amount
        vb = b.amount
      } else {
        const riskMap: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
        va = riskMap[a.riskLevel]
        vb = riskMap[b.riskLevel]
      }
      return sortOrder === 'asc' ? va - vb : vb - va
    })

    return result
  }, [bills, keyword, statusFilter, riskFilter, holdTypeFilter, reviewFilter, sortField, sortOrder])

  const concentrationRisks = useMemo(() => {
    const map = new Map<string, { name: string; count: number; amount: number; dueDates: string[] }>()
    bills
      .filter((b) => b.daysToDue <= 30 && b.status !== 'paid' && b.status !== 'closed')
      .forEach((b) => {
        const existing = map.get(b.acceptorId) || {
          name: b.acceptorName,
          count: 0,
          amount: 0,
          dueDates: [],
        }
        existing.count++
        existing.amount += b.amount
        existing.dueDates.push(b.dueDate)
        map.set(b.acceptorId, existing)
      })
    return Array.from(map.entries())
      .map(([id, val]) => ({
        id,
        ...val,
        minDue: val.dueDates.sort()[0],
        maxDue: val.dueDates.sort()[val.dueDates.length - 1],
      }))
      .filter((v) => v.count >= 3)
      .sort((a, b) => b.count - a.count)
  }, [bills])

  const criticalCount = bills.filter((b) => b.riskLevel === 'critical').length
  const dueWithin7 = bills.filter((b) => b.daysToDue >= 0 && b.daysToDue <= 7 && b.status !== 'paid').length
  const pendingReview = bills.filter((b) => b.requiresReview && !b.reviewed).length
  const pendingPayment = bills.filter((b) => b.status === 'pending_payment').length
  const totalAmount = bills.reduce((s, b) => s + b.amount, 0)

  const getDaysToDueTag = (days: number) => {
    if (days < 0) return <Tag variant="danger">逾期 {Math.abs(days)}天</Tag>
    if (days <= 3) return <Tag variant="danger">剩余 {days}天</Tag>
    if (days <= 7) return <Tag variant="warning">剩余 {days}天</Tag>
    if (days <= 15) return <Tag variant="info">剩余 {days}天</Tag>
    return <Tag>剩余 {days}天</Tag>
  }

  const handleSort = (field: 'dueDate' | 'amount' | 'risk') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleConfirmAssign = () => {
    if (!selectedManager) return
    const manager = managers.find((m) => m.id === selectedManager)
    if (!manager) return
    if (currentBill) {
      assignBillToManager(currentBill.id, manager.id, manager.name, {
        priority: assignPriority,
        note: assignNote,
      })
    } else if (selectedBillIds.length > 0) {
      batchAssignToManager(selectedBillIds, manager.id, manager.name, {
        priority: assignPriority,
        note: assignNote,
      })
    }
    setAssignModal(false)
    setCurrentBill(null)
    setSelectedManager('')
    setAssignPriority(3)
    setAssignNote('')
    clearBillSelection()
  }

  const columns: Column<Bill>[] = [
    {
      key: 'billNo',
      title: '票据号码',
      dataIndex: 'billNo',
      render: (v) => <span className="font-mono text-xs">{v}</span>,
    },
    {
      key: 'amount',
      title: (
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('amount')}>
          票面金额
          <ArrowUpDown size={12} />
        </div>
      ),
      dataIndex: 'amount',
      align: 'right',
      render: (v) => <span className="font-medium">{formatAmountFull(v)}</span>,
    },
    {
      key: 'acceptorName',
      title: '承兑人',
      dataIndex: 'acceptorName',
      render: (v, record) => {
        const acc = acceptorMap.get(record.acceptorName)
        const isConcentrated = concentrationRisks.some((c) => c.id === record.acceptorId)
        return (
          <div>
            <div className="font-medium">{v}</div>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {acc && (acc.riskLevel === 'critical' || acc.riskLevel === 'high') && (
                <RiskTag level={acc.riskLevel as any} />
              )}
              {acc && acc.dishonorRate >= 3 && (
                <Tag variant="warning" size="sm">拒付率 {acc.dishonorRate}%</Tag>
              )}
              {isConcentrated && (
                <Tag variant="warning" size="sm">
                  <AlertTriangle size={10} className="mr-0.5" />集中到期
                </Tag>
              )}
              {acc && acc.concentratedDueCount && acc.concentratedDueCount >= 3 && !isConcentrated && (
                <Tag variant="warning" size="sm">集中到期 {acc.concentratedDueCount}张</Tag>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'dueDate',
      title: (
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('dueDate')}>
          <Clock size={12} />
          到期日
          <ArrowUpDown size={12} />
        </div>
      ),
      dataIndex: 'dueDate',
      render: (_, record) => (
        <div>
          <div>{record.dueDate}</div>
          {getDaysToDueTag(record.daysToDue)}
        </div>
      ),
    },
    {
      key: 'status',
      title: '状态',
      dataIndex: 'status',
      render: (v) => <StatusTag status={v} />,
    },
    {
      key: 'holdType',
      title: '持有类型',
      dataIndex: 'holdType',
      render: (v) =>
        v === 'self_held' ? (
          <Tag variant="primary">自持票据</Tag>
        ) : (
          <Tag variant="info">已背书转让</Tag>
        ),
    },
    {
      key: 'riskLevel',
      title: (
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('risk')}>
          风险等级
          <ArrowUpDown size={12} />
        </div>
      ),
      dataIndex: 'riskLevel',
      render: (v) => <RiskTag level={v} />,
    },
    {
      key: 'review',
      title: '复核状态',
      render: (_, record) =>
        record.requiresReview ? (
          record.reviewed ? (
            record.reviewStatus === 'approved' ? (
              <Tag variant="success"><CheckCircle2 size={10} className="mr-1" />已复核</Tag>
            ) : (
              <Tag variant="danger"><XCircle size={10} className="mr-1" />复核驳回</Tag>
            )
          ) : (
            <Tag variant="warning"><AlertTriangle size={10} className="mr-1" />待复核</Tag>
          )
        ) : (
          <span className="text-[var(--color-text-muted)] text-xs">无需复核</span>
        ),
    },
    { key: 'managerName', title: '客户经理', dataIndex: 'managerName' },
    {
      key: 'suggestion',
      title: '处置建议',
      width: 200,
      render: (_, record) => {
        const suggestions = getDisposalSuggestions(record)
        const top = suggestions[0]
        if (!top) return <span className="text-[var(--color-text-muted)] text-xs">正常</span>
        const colorMap: Record<string, 'danger' | 'warning' | 'info' | 'default'> = {
          critical: 'danger',
          high: 'warning',
          medium: 'info',
          low: 'default',
        }
        return (
          <div className="space-y-1">
            <Tag variant={colorMap[top.priority] || 'default'} size="sm">
              <Lightbulb size={10} className="mr-0.5" />
              {top.title}
            </Tag>
            {suggestions.length > 1 && (
              <div className="text-[10px] text-[var(--color-text-muted)]">
                另有 {suggestions.length - 1} 项建议
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'action',
      title: '操作',
      width: 280,
      render: (_, record) => (
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            icon={<Send size={12} />}
            onClick={() => addPaymentPrompt({ billId: record.id, promptMethod: 'system' })}
          >
            提示付款
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<UserPlus size={12} />}
            onClick={() => {
              setCurrentBill(record)
              setAssignModal(true)
            }}
          >
            分配
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Eye size={12} />}
            onClick={() => {
              setDetailBill(record)
              setShowBillDetail(true)
            }}
          >
            详情
          </Button>
          {record.requiresReview && !record.reviewed && (
            <Button variant="ghost" size="sm" onClick={() => markAsReviewed(record.id, true)}>
              通过
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="grid grid-cols-5 gap-3">
        <StatCard title="在库票据总数" value={bills.length} subValue={`总金额 ${formatAmount(totalAmount)}元`} icon={AlertTriangle} iconColor="primary" />
        <StatCard title="7天内到期" value={dueWithin7} trend={12} icon={Clock} iconColor="warning" />
        <StatCard title="极高风险" value={criticalCount} trend={-5} icon={AlertTriangle} iconColor="danger" />
        <StatCard title="待复核票据" value={pendingReview} icon={CheckCircle2} iconColor="info" />
        <StatCard title="待付款反馈" value={pendingPayment} icon={Send} iconColor="primary" />
      </div>

      {concentrationRisks.length > 0 && (
        <Card
          title={
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-[var(--color-warning)]" />
              承兑人集中到期风险预警
            </div>
          }
          extra={
            <Button variant="ghost" size="sm" onClick={() => setShowRiskConcentration(true)}>
              查看全部 ({concentrationRisks.length})
            </Button>
          }
          padding="none"
        >
          <div className="grid grid-cols-3 gap-3 p-3">
            {concentrationRisks.slice(0, 6).map((c) => (
              <div
                key={c.id}
                className="p-3 rounded border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)]"
              >
                <div className="font-medium text-[var(--color-text-primary)] truncate" title={c.name}>
                  {c.name}
                </div>
                <div className="flex items-center justify-between mt-2 text-sm">
                  <span className="text-[var(--color-text-secondary)]">
                    <b className="text-[var(--color-danger)]">{c.count}</b> 张票据
                  </span>
                  <span className="text-[var(--color-text-secondary)]">
                    合计 <b>{formatAmount(c.amount)}</b>
                  </span>
                </div>
                <div className="text-xs text-[var(--color-text-muted)] mt-1">
                  到期区间：{c.minDue} ~ {c.maxDue}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="到期队列" className="flex-1 min-h-0" bodyClassName="h-full flex flex-col">
        <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-[var(--color-border)]">
          <Input
            placeholder="搜索票据号、承兑人、客户经理..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-64"
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: '全部状态' },
              { value: 'holding', label: '自持中' },
              { value: 'endorsed', label: '已背书' },
              { value: 'pending_payment', label: '待付款' },
              { value: 'paid', label: '已结清' },
              { value: 'dishonored', label: '已拒付' },
              { value: 'recourse', label: '追索中' },
            ]}
          />
          <Select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            options={[
              { value: 'all', label: '全部风险' },
              { value: 'critical', label: '极高风险' },
              { value: 'high', label: '高风险' },
              { value: 'medium', label: '中风险' },
              { value: 'low', label: '低风险' },
            ]}
          />
          <Select
            value={holdTypeFilter}
            onChange={(e) => setHoldTypeFilter(e.target.value)}
            options={[
              { value: 'all', label: '全部持有类型' },
              { value: 'self_held', label: '自持票据' },
              { value: 'endorsed', label: '已背书转让' },
            ]}
          />
          <Select
            value={reviewFilter}
            onChange={(e) => setReviewFilter(e.target.value)}
            options={[
              { value: 'all', label: '全部复核' },
              { value: 'pending', label: '待复核' },
              { value: 'approved', label: '已复核通过' },
            ]}
          />
          <div className="flex-1" />
          {selectedBillIds.length > 0 && (
            <>
              <span className="text-sm text-[var(--color-text-secondary)]">
                已选择 <b>{selectedBillIds.length}</b> 项
              </span>
              <Button
                variant="outline"
                size="sm"
                icon={<Send size={14} />}
                onClick={() => {
                  const { success } = batchAddPaymentPrompt(selectedBillIds, 'system')
                  if (success > 0) {
                    clearBillSelection()
                  }
                }}
              >
                批量提示付款
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<UserPlus size={14} />}
                onClick={() => {
                  setCurrentBill(null)
                  setAssignModal(true)
                }}
              >
                批量分配
              </Button>
              <Button variant="ghost" size="sm" onClick={clearBillSelection}>
                取消选择
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" icon={<Filter size={14} />}>
            高级筛选
          </Button>
        </div>

        <div className="flex-1 overflow-auto min-h-0">
          <Table
            columns={columns}
            data={filteredBills}
            selectable
            selectedRowKeys={selectedBillIds}
            onSelectChange={(keys) => {
              clearBillSelection()
              keys.forEach((k) => toggleBillSelection(k))
            }}
          />
        </div>

        <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-sm">
          <div className="text-[var(--color-text-secondary)]">
            共 <b>{filteredBills.length}</b> 条记录
            {selectedBillIds.length > 0 && (
              <span className="ml-2">
                ，已选择 <b className="text-[var(--color-primary)]">{selectedBillIds.length}</b> 条
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm">上一页</Button>
            <span className="px-3 py-1 rounded bg-[var(--color-primary)] text-white text-sm">1</span>
            <Button variant="ghost" size="sm">2</Button>
            <Button variant="ghost" size="sm">3</Button>
            <Button variant="ghost" size="sm">...</Button>
            <Button variant="ghost" size="sm">下一页</Button>
          </div>
        </div>
      </Card>

      <Modal
        open={assignModal}
        title={currentBill ? `分配客户经理 - ${currentBill.billNo}` : `批量分配客户经理 (${selectedBillIds.length} 张)`}
        width={450}
        onClose={() => setAssignModal(false)}
        onOk={handleConfirmAssign}
        okText="确认分配"
      >
        <div className="space-y-4">
          {currentBill && (
            <div className="p-3 bg-[var(--color-bg-tertiary)] rounded text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">票据号码</span>
                <span className="font-mono">{currentBill.billNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">票面金额</span>
                <span className="font-medium">{formatAmountFull(currentBill.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">承兑人</span>
                <span>{currentBill.acceptorName}</span>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1.5">
              选择客户经理 <span className="text-[var(--color-danger)]">*</span>
            </label>
            <Select
              value={selectedManager}
              onChange={(e) => setSelectedManager(e.target.value)}
              className="w-full"
              options={[
                { value: '', label: '请选择客户经理' },
                ...managers.map((m) => ({
                  value: m.id,
                  label: `${m.name}（${m.department}，在办 ${m.pendingCount}）`,
                })),
              ]}
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1.5">
              任务优先级
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((p) => {
                const labels: Record<number, string> = { 1: '紧急', 2: '高', 3: '中', 4: '低', 5: '常规' }
                return (
                  <button
                    key={p}
                    className={`flex-1 py-2 rounded border text-sm transition-colors ${
                      assignPriority === p
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'bg-white border-[var(--color-border)] hover:border-[var(--color-primary)]'
                    }`}
                    onClick={() => setAssignPriority(p as 1 | 2 | 3 | 4 | 5)}
                  >
                    {p} 级
                    <div className="text-[10px] opacity-70 mt-0.5">
                      {labels[p]}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1.5">
              备注说明
            </label>
            <textarea
              className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded text-sm outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary-border)] resize-none"
              rows={3}
              placeholder="可填写跟单注意事项、特殊要求等..."
              value={assignNote}
              onChange={(e) => setAssignNote(e.target.value)}
            />
          </div>
          <div className="p-3 bg-[var(--color-bg-tertiary)] rounded text-xs text-[var(--color-text-muted)]">
            <div>提示：分配后系统将自动创建处置记录，完整留痕。</div>
          </div>
        </div>
      </Modal>

      <Modal
        open={showRiskConcentration}
        title="承兑人集中到期风险清单"
        width={900}
        onClose={() => setShowRiskConcentration(false)}
        footer={null}
      >
        <div className="max-h-[60vh] overflow-auto">
          <Table
            columns={[
              { key: 'name', title: '承兑人', dataIndex: 'name' },
              { key: 'count', title: '票据数量', dataIndex: 'count', align: 'center',
                render: (v) => <span className="text-[var(--color-danger)] font-medium">{v} 张</span> },
              { key: 'amount', title: '合计金额', dataIndex: 'amount', align: 'right',
                render: (v) => formatAmountFull(v) },
              { key: 'range', title: '到期区间',
                render: (_, r: any) => `${r.minDue} ~ ${r.maxDue}` },
              { key: 'countDays', title: '密集程度',
                render: (_, r: any) => {
                  const start = new Date(r.minDue)
                  const end = new Date(r.maxDue)
                  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
                  return days <= 7 ? <Tag variant="danger">极度密集 ({days}天)</Tag>
                    : days <= 15 ? <Tag variant="warning">较为密集 ({days}天)</Tag>
                    : <Tag>正常分布 ({days}天)</Tag>
                }
              },
            ]}
            data={concentrationRisks as any[]}
          />
        </div>
      </Modal>

      <Modal
        open={showBillDetail && !!detailBill}
        title={
          <div className="flex items-center gap-2">
            <ChevronRight size={18} className="text-[var(--color-primary)]" />
            票据处置详情
            <span className="font-mono text-sm text-[var(--color-text-muted)] ml-2">
              {detailBill?.billNo}
            </span>
          </div>
        }
        width={850}
        onClose={() => {
          setShowBillDetail(false)
          setDetailBill(null)
        }}
        footer={
          <div className="flex justify-between w-full">
            <div className="flex gap-2">
              <Button
                variant="outline"
                icon={<Send size={14} />}
                onClick={() => {
                  if (detailBill) addPaymentPrompt({ billId: detailBill.id, promptMethod: 'system' })
                }}
              >
                立即提示付款
              </Button>
              <Button
                variant="outline"
                icon={<UserPlus size={14} />}
                onClick={() => {
                  if (detailBill) {
                    setCurrentBill(detailBill)
                    setShowBillDetail(false)
                    setAssignModal(true)
                  }
                }}
              >
                分配客户经理
              </Button>
            </div>
            <Button variant="secondary" onClick={() => {
              setShowBillDetail(false)
              setDetailBill(null)
            }}>
              关闭
            </Button>
          </div>
        }
      >
        {detailBill && (
          <div className="space-y-5">
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 rounded bg-[var(--color-bg-tertiary)]">
                <div className="text-xs text-[var(--color-text-muted)] mb-1">票面金额</div>
                <div className="text-lg font-bold text-[var(--color-text-primary)]">{formatAmountFull(detailBill.amount)}</div>
              </div>
              <div className="p-3 rounded bg-[var(--color-bg-tertiary)]">
                <div className="text-xs text-[var(--color-text-muted)] mb-1">到期日期</div>
                <div className="text-lg font-bold text-[var(--color-text-primary)]">{detailBill.dueDate}</div>
                <div className="text-xs mt-0.5">{detailBill.daysToDue < 0 ? `逾期${Math.abs(detailBill.daysToDue)}天` : `剩余${detailBill.daysToDue}天`}</div>
              </div>
              <div className="p-3 rounded bg-[var(--color-bg-tertiary)]">
                <div className="text-xs text-[var(--color-text-muted)] mb-1">票据状态</div>
                <div className="mt-1"><StatusTag status={detailBill.status} /></div>
              </div>
              <div className="p-3 rounded bg-[var(--color-bg-tertiary)]">
                <div className="text-xs text-[var(--color-text-muted)] mb-1">风险等级</div>
                <div className="mt-1"><RiskTag level={detailBill.riskLevel} /></div>
              </div>
            </div>

            <Card title="基础信息" padding="sm">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex"><span className="w-24 text-[var(--color-text-muted)] shrink-0">出票日期</span><span>{detailBill.issueDate || '-'}</span></div>
                <div className="flex"><span className="w-24 text-[var(--color-text-muted)] shrink-0">持有类型</span><span>{detailBill.holdType === 'self_held' ? '自持票据' : '已背书转让'}</span></div>
                <div className="flex"><span className="w-24 text-[var(--color-text-muted)] shrink-0">承兑人</span><span className="font-medium">{detailBill.acceptorName}</span></div>
                <div className="flex"><span className="w-24 text-[var(--color-text-muted)] shrink-0">出票人</span><span>{detailBill.drawer || '-'}</span></div>
                <div className="flex"><span className="w-24 text-[var(--color-text-muted)] shrink-0">收款人</span><span>{detailBill.payee || '-'}</span></div>
                <div className="flex items-start"><span className="w-24 text-[var(--color-text-muted)] shrink-0 pt-0.5">客户经理</span><span>{detailBill.managerName ? detailBill.managerName : <Tag variant="warning" size="sm">未分配</Tag>}</span></div>
                <div className="flex items-start"><span className="w-24 text-[var(--color-text-muted)] shrink-0 pt-0.5">复核状态</span><span>
                  {detailBill.requiresReview ? (
                    detailBill.reviewed ? (
                      detailBill.reviewStatus === 'approved'
                        ? <Tag variant="success" size="sm"><CheckCircle2 size={10} className="mr-0.5" />已复核通过</Tag>
                        : <Tag variant="danger" size="sm"><XCircle size={10} className="mr-0.5" />复核驳回</Tag>
                    ) : (
                      <Tag variant="warning" size="sm"><AlertTriangle size={10} className="mr-0.5" />待复核</Tag>
                    )
                  ) : (
                    <Tag variant="default" size="sm">无需复核</Tag>
                  )}
                </span></div>
                <div className="flex"><span className="w-24 text-[var(--color-text-muted)] shrink-0">最后更新</span><span>{detailBill.updatedAt || '-'}</span></div>
              </div>
            </Card>

            <Card
              title={
                <div className="flex items-center gap-2">
                  <Lightbulb size={16} className="text-[var(--color-warning)]" />
                  处置建议（按优先级排序）
                </div>
              }
              padding="sm"
            >
              <div className="space-y-2">
                {getDisposalSuggestions(detailBill).map((s, idx) => {
                  const colorMap: Record<string, { bg: string; border: string; text: string; label: string }> = {
                    critical: { bg: 'bg-[var(--color-danger-bg)]', border: 'border-[var(--color-danger-border)]', text: 'text-[var(--color-danger)]', label: '紧急' },
                    high: { bg: 'bg-[var(--color-warning-bg)]', border: 'border-[var(--color-warning-border)]', text: 'text-[var(--color-warning)]', label: '高优' },
                    medium: { bg: 'bg-[var(--color-info-bg)]', border: 'border-[var(--color-info-border)]', text: 'text-[var(--color-info)]', label: '中优' },
                    low: { bg: 'bg-[var(--color-bg-tertiary)]', border: 'border-[var(--color-border)]', text: 'text-[var(--color-text-secondary)]', label: '低优' },
                  }
                  const c = colorMap[s.priority] || colorMap.low
                  return (
                    <div key={idx} className={`p-3 rounded border ${c.bg} ${c.border}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Tag variant={s.priority === 'critical' ? 'danger' : s.priority === 'high' ? 'warning' : s.priority === 'medium' ? 'info' : 'default'} size="sm">
                          {c.label}
                        </Tag>
                        <span className={`font-medium ${c.text}`}>{s.title}</span>
                      </div>
                      <div className="text-sm text-[var(--color-text-secondary)]">{s.desc}</div>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card
              title={
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-[var(--color-primary)]" />
                  处置优先级排名原因
                </div>
              }
              padding="sm"
            >
              <div className="flex flex-wrap gap-2">
                {getRankingReasons(detailBill).map((r, idx) => (
                  <Tag key={idx} variant="primary" className="inline-flex">
                    #{idx + 1} {r}
                  </Tag>
                ))}
              </div>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  )
}
