import React, { useState, useMemo } from 'react'
import { AlertTriangle, Clock, ArrowUpDown, Filter, Send, CheckCircle2, XCircle, UserPlus } from 'lucide-react'
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
    markAsReviewed,
    addPaymentPrompt,
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
  const [showRiskConcentration, setShowRiskConcentration] = useState(false)

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
    if (currentBill && manager) {
      assignBillToManager(currentBill.id, manager.id, manager.name)
    } else {
      selectedBillIds.forEach((bid) => {
        const mgr = managers.find((m) => m.id === selectedManager)
        if (mgr) {
          const bill = bills.find((b) => b.id === bid)
          if (bill) assignBillToManager(bid, mgr.id, mgr.name)
        }
      })
    }
    setAssignModal(false)
    setCurrentBill(null)
    setSelectedManager('')
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
      render: (v, record) => (
        <div>
          <div className="font-medium">{v}</div>
          {concentrationRisks.some((c) => c.id === record.acceptorId) && (
            <div className="flex items-center gap-1 mt-0.5">
              <AlertTriangle size={10} className="text-[var(--color-warning)]" />
              <span className="text-[11px] text-[var(--color-warning)]">集中到期风险</span>
            </div>
          )}
        </div>
      ),
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
      key: 'action',
      title: '操作',
      width: 240,
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
              <Button variant="outline" size="sm" icon={<Send size={14} />}>
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
    </div>
  )
}
