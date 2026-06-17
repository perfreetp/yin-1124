import React, { useState, useMemo } from 'react'
import { Users, Trophy, ListTodo, Clock, AlertTriangle, CheckCircle2, ChevronRight, Send, UserPlus, Star } from 'lucide-react'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Table, Column } from '@/components/Table'
import { Tag, RiskTag } from '@/components/Tag'
import { Input, Select, TextArea } from '@/components/Form'
import { StatCard } from '@/components/StatCard'
import { Modal } from '@/components/Modal'
import { useWorkbenchStore, formatAmountFull, formatAmount } from '@/store/workbench'
import type { Bill, Assignment } from '@/types'
import dayjs from 'dayjs'

export const FollowPanel: React.FC = () => {
  const { bills, managers, assignments, dailyPriority, assignBillToManager, markAsReviewed } = useWorkbenchStore()
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'priority' | 'manager' | 'review'>('priority')
  const [assignModal, setAssignModal] = useState(false)
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [targetManager, setTargetManager] = useState('')
  const [priority, setPriority] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [note, setNote] = useState('')

  const pendingReviews = useMemo(
    () => bills.filter((b) => b.requiresReview && !b.reviewed && b.status !== 'paid' && b.status !== 'closed'),
    [bills]
  )

  const managerWorkloads = useMemo(() => {
    return managers.map((m) => {
      const managerBills = bills.filter((b) => b.managerId === m.id && b.status !== 'paid' && b.status !== 'closed')
      const highPriority = managerBills.filter((b) => b.riskLevel === 'critical' || b.riskLevel === 'high').length
      const dueWithin7 = managerBills.filter((b) => b.daysToDue <= 7 && b.daysToDue >= 0).length
      const managerAssignments = assignments.filter((a) => a.managerId === m.id && a.status !== 'completed')
      return {
        ...m,
        billCount: managerBills.length,
        highPriority,
        dueWithin7,
        pendingTasks: managerAssignments.length,
        billList: managerBills.sort((a, b) => a.daysToDue - b.daysToDue),
      }
    })
  }, [managers, bills, assignments])

  const selectedManager = managerWorkloads.find((m) => m.id === selectedManagerId)

  const handleAssign = () => {
    if (selectedBill && targetManager) {
      const mgr = managers.find((m) => m.id === targetManager)
      if (mgr) {
        assignBillToManager(selectedBill.id, mgr.id, mgr.name)
      }
    }
    setAssignModal(false)
    setSelectedBill(null)
    setTargetManager('')
    setPriority(3)
    setNote('')
  }

  const priorityBillColumns: Column<typeof dailyPriority.rankings[0]>[] = [
    {
      key: 'rank',
      title: '优先级',
      width: 70,
      align: 'center',
      render: (_, __, idx) => (
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto text-sm font-bold ${
            idx === 0
              ? 'bg-[var(--color-danger)] text-white'
              : idx < 3
              ? 'bg-[var(--color-warning)] text-white'
              : idx < 6
              ? 'bg-[var(--color-info-light)] text-white'
              : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
          }`}
        >
          {idx + 1}
        </div>
      ),
    },
    {
      key: 'score',
      title: '优先级分数',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <div>
          <div className="font-bold text-lg">{record.priorityScore}</div>
          <div className="w-16 h-1.5 bg-[var(--color-border)] rounded-full mx-auto mt-1 overflow-hidden">
            <div
              className="h-full bg-[var(--color-primary)] rounded-full"
              style={{ width: `${record.priorityScore}%` }}
            />
          </div>
        </div>
      ),
    },
    { key: 'billNo', title: '票据号码', dataIndex: 'billNo', render: (v) => <span className="font-mono text-xs">{v}</span> },
    { key: 'acceptorName', title: '承兑人', dataIndex: 'acceptorName', render: (v) => <span className="font-medium">{v}</span> },
    { key: 'amount', title: '票面金额', dataIndex: 'amount', align: 'right', render: (v) => formatAmountFull(v) },
    { key: 'dueDate', title: '到期日期', dataIndex: 'dueDate' },
    {
      key: 'reasons',
      title: '上榜理由',
      render: (_, record) => (
        <div className="flex flex-wrap gap-1">
          {record.reasons.map((r, i) => (
            <Tag key={i} variant={r.includes('高风险') || r.includes('已到期') ? 'danger' : r.includes('临期') || r.includes('大额') ? 'warning' : 'info'}>
              {r}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      key: 'action',
      title: '操作',
      width: 150,
      render: (_, record) => {
        const bill = bills.find((b) => b.billNo === record.billNo)
        return (
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              icon={<UserPlus size={12} />}
              onClick={() => {
                setSelectedBill(bill || null)
                setAssignModal(true)
              }}
            >
              分配跟单
            </Button>
          </div>
        )
      },
    },
  ]

  const reviewColumns: Column<Bill>[] = [
    { key: 'billNo', title: '票据号码', dataIndex: 'billNo', render: (v) => <span className="font-mono text-xs">{v}</span> },
    { key: 'amount', title: '票面金额', dataIndex: 'amount', align: 'right',
      render: (v) => <span className="font-medium">{formatAmountFull(v)}</span> },
    { key: 'acceptorName', title: '承兑人', dataIndex: 'acceptorName' },
    { key: 'dueDate', title: '到期日期', dataIndex: 'dueDate' },
    { key: 'riskLevel', title: '风险等级', dataIndex: 'riskLevel', render: (v) => <RiskTag level={v} /> },
    { key: 'managerName', title: '客户经理', dataIndex: 'managerName' },
    { key: 'createdAt', title: '入库时间', dataIndex: 'createdAt' },
    {
      key: 'action',
      title: '复核操作',
      width: 200,
      render: (_, record) => (
        <div className="flex gap-1">
          <Button
            variant="primary"
            size="sm"
            icon={<CheckCircle2 size={12} />}
            onClick={() => markAsReviewed(record.id, true)}
          >
            复核通过
          </Button>
          <Button variant="ghost" size="sm" onClick={() => markAsReviewed(record.id, false)}>
            驳回
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex gap-3">
        <Button
          variant={viewMode === 'priority' ? 'primary' : 'secondary'}
          size="sm"
          icon={<Trophy size={14} />}
          onClick={() => setViewMode('priority')}
        >
          每日处置优先级
        </Button>
        <Button
          variant={viewMode === 'manager' ? 'primary' : 'secondary'}
          size="sm"
          icon={<Users size={14} />}
          onClick={() => setViewMode('manager')}
        >
          客户经理任务分配
        </Button>
        <Button
          variant={viewMode === 'review' ? 'primary' : 'secondary'}
          size="sm"
          icon={<AlertTriangle size={14} />}
          onClick={() => setViewMode('review')}
        >
          高金额复核节点
          {pendingReviews.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded bg-[var(--color-danger)] text-white text-[10px]">
              {pendingReviews.length}
            </span>
          )}
        </Button>
        <div className="flex-1" />
        <div className="text-sm text-[var(--color-text-muted)] self-center">
          {dailyPriority.date} 数据更新
        </div>
      </div>

      {viewMode === 'priority' && (
        <>
          <div className="grid grid-cols-4 gap-3">
            <StatCard title="今日待处置" value={dailyPriority.rankings.length} icon={ListTodo} iconColor="primary" />
            <StatCard title="极高优先级" value={dailyPriority.rankings.filter(r => r.priorityScore >= 80).length} icon={AlertTriangle} iconColor="danger" />
            <StatCard title="已分配跟单" value={dailyPriority.rankings.filter(r => {
              const b = bills.find(bill => bill.billNo === r.billNo)
              return b?.managerName
            }).length} icon={Users} iconColor="info" />
            <StatCard title="大额票据(≥500万)" value={dailyPriority.rankings.filter(r => r.amount >= 5000000).length} icon={Star} iconColor="warning" />
          </div>

          <Card title={`每日处置优先级榜单 TOP${dailyPriority.rankings.length}`} className="flex-1 min-h-0" bodyClassName="h-full flex flex-col">
            <div className="flex-1 overflow-auto min-h-0">
              <Table columns={priorityBillColumns} data={dailyPriority.rankings} />
            </div>
          </Card>
        </>
      )}

      {viewMode === 'manager' && (
        <div className="grid grid-cols-[280px_1fr] gap-4 flex-1 min-h-0">
          <Card title="客户经理一览" padding="none" className="flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto">
              {managerWorkloads.map((m) => (
                <button
                  key={m.id}
                  className={`w-full text-left p-3 border-b border-[var(--color-border-light)] last:border-b-0 transition-colors flex items-center gap-3 ${
                    selectedManagerId === m.id
                      ? 'bg-[var(--color-primary-bg)] border-l-4 border-l-[var(--color-primary)]'
                      : 'hover:bg-[var(--color-bg-hover)]'
                  }`}
                  onClick={() => setSelectedManagerId(m.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center text-[var(--color-text-primary)] font-medium shrink-0">
                    {m.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{m.name}</span>
                      <ChevronRight size={14} className="text-[var(--color-text-muted)]" />
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)]">{m.department}</div>
                    <div className="flex gap-3 mt-1 text-[11px]">
                      <span className="text-[var(--color-text-secondary)]">
                        在办 <b className="text-[var(--color-primary)]">{m.billCount}</b>
                      </span>
                      {m.dueWithin7 > 0 && (
                        <span className="text-[var(--color-danger)]">
                          临期 <b>{m.dueWithin7}</b>
                        </span>
                      )}
                      {m.highPriority > 0 && (
                        <span className="text-[var(--color-warning)]">
                          高危 <b>{m.highPriority}</b>
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card
            title={
              selectedManager
                ? `${selectedManager.name} - 跟单任务清单（${selectedManager.billCount} 张）`
                : '请选择客户经理查看任务'
            }
            className="flex-1 min-h-0"
            bodyClassName="h-full flex flex-col"
          >
            {selectedManager ? (
              <div className="flex-1 overflow-auto min-h-0">
                <Table
                  columns={[
                    { key: 'billNo', title: '票据号码', dataIndex: 'billNo', render: (v) => <span className="font-mono text-xs">{v}</span> },
                    { key: 'amount', title: '票面金额', dataIndex: 'amount', align: 'right', render: (v) => formatAmountFull(v) },
                    { key: 'acceptorName', title: '承兑人', dataIndex: 'acceptorName' },
                    { key: 'dueDate', title: '到期日期', dataIndex: 'dueDate' },
                    {
                      key: 'daysToDue',
                      title: '剩余天数',
                      dataIndex: 'daysToDue',
                      align: 'center',
                      render: (v) => {
                        if (v < 0) return <Tag variant="danger">逾期 {Math.abs(v)}天</Tag>
                        if (v <= 3) return <Tag variant="danger">{v}天</Tag>
                        if (v <= 7) return <Tag variant="warning">{v}天</Tag>
                        if (v <= 15) return <Tag variant="info">{v}天</Tag>
                        return <Tag>{v}天</Tag>
                      },
                    },
                    { key: 'riskLevel', title: '风险', dataIndex: 'riskLevel', render: (v) => <RiskTag level={v} /> },
                    {
                      key: 'review',
                      title: '复核',
                      render: (_, r: Bill) =>
                        r.requiresReview ? (
                          r.reviewed ? (
                            <Tag variant="success">已复核</Tag>
                          ) : (
                            <Tag variant="warning">待复核</Tag>
                          )
                        ) : (
                          <span className="text-[var(--color-text-muted)] text-xs">无需</span>
                        ),
                    },
                    {
                      key: 'action',
                      title: '操作',
                      width: 120,
                      render: (_, record) => (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Send size={12} />}
                        >
                          查看进度
                        </Button>
                      ),
                    },
                  ]}
                  data={selectedManager.billList}
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)]">
                <div className="text-center">
                  <Users size={48} className="mx-auto mb-2 opacity-30" />
                  <div>从左侧选择客户经理查看其跟单任务</div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {viewMode === 'review' && (
        <Card
          title={`高金额票据复核节点（待复核 ${pendingReviews.length} 张）`}
          extra={
            <div className="text-sm text-[var(--color-text-muted)]">
              规则：票面金额 ≥ 500 万元的票据需风险复核岗二次确认
            </div>
          }
          className="flex-1 min-h-0"
          bodyClassName="h-full flex flex-col"
        >
          <div className="flex-1 overflow-auto min-h-0">
            <Table columns={reviewColumns} data={pendingReviews} />
          </div>
        </Card>
      )}

      <Modal
        open={assignModal}
        title={`分配跟单任务${selectedBill ? ` - ${selectedBill.billNo}` : ''}`}
        width={500}
        onClose={() => setAssignModal(false)}
        onOk={handleAssign}
        okText="确认分配"
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
                <span className="text-[var(--color-text-muted)]">承兑人</span>
                <span>{selectedBill.acceptorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">到期日期</span>
                <span>{selectedBill.dueDate}（剩余 {selectedBill.daysToDue} 天）</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1.5">
              选择客户经理 <span className="text-[var(--color-danger)]">*</span>
            </label>
            <Select
              value={targetManager}
              onChange={(e) => setTargetManager(e.target.value)}
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
              {[1, 2, 3, 4, 5].map((p) => (
                <button
                  key={p}
                  className={`flex-1 py-2 rounded border text-sm transition-colors ${
                    priority === p
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-white border-[var(--color-border)] hover:border-[var(--color-primary)]'
                  }`}
                  onClick={() => setPriority(p as 1 | 2 | 3 | 4 | 5)}
                >
                  {p} 级
                  <div className="text-[10px] opacity-70 mt-0.5">
                    {p === 1 ? '紧急' : p === 2 ? '高' : p === 3 ? '中' : p === 4 ? '低' : '常规'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1.5">
              备注说明
            </label>
            <TextArea
              rows={3}
              placeholder="可填写跟单注意事项、特殊要求等..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
