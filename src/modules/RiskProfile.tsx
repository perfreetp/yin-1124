import React, { useState, useMemo } from 'react'
import { Search, TrendingDown, AlertTriangle, BarChart3, Building2, MapPin, Briefcase, Clock, FileText, ChevronRight } from 'lucide-react'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Table, Column } from '@/components/Table'
import { RiskTag, PerformanceTag, Tag } from '@/components/Tag'
import { Input, Select } from '@/components/Form'
import { StatCard } from '@/components/StatCard'
import { Modal } from '@/components/Modal'
import { useWorkbenchStore, formatAmountFull, formatAmount } from '@/store/workbench'
import type { Acceptor } from '@/types'

export const RiskProfile: React.FC = () => {
  const { acceptors, bills, dishonorRecords } = useWorkbenchStore()
  const [keyword, setKeyword] = useState('')
  const [riskFilter, setRiskFilter] = useState('all')
  const [performanceFilter, setPerformanceFilter] = useState('all')
  const [selectedAcceptor, setSelectedAcceptor] = useState<Acceptor | null>(null)

  const filteredAcceptors = useMemo(() => {
    let result = [...acceptors]
    if (keyword) {
      const kw = keyword.toLowerCase()
      result = result.filter(
        (a) => a.name.toLowerCase().includes(kw) || a.creditCode.includes(kw) || a.industry.includes(kw)
      )
    }
    if (riskFilter !== 'all') {
      result = result.filter((a) => a.riskLevel === riskFilter)
    }
    if (performanceFilter !== 'all') {
      result = result.filter((a) => a.performance === performanceFilter)
    }
    return result.sort((a, b) => {
      const riskMap: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
      return riskMap[b.riskLevel] - riskMap[a.riskLevel]
    })
  }, [acceptors, keyword, riskFilter, performanceFilter])

  const acceptorBills = useMemo(() => {
    if (!selectedAcceptor) return []
    return bills.filter((b) => b.acceptorId === selectedAcceptor.id)
  }, [selectedAcceptor, bills])

  const acceptorDishonors = useMemo(() => {
    if (!selectedAcceptor) return []
    const acceptorBillIds = acceptorBills.map((b) => b.id)
    return dishonorRecords.filter((d) => acceptorBillIds.includes(d.billId))
  }, [selectedAcceptor, acceptorBills, dishonorRecords])

  const criticalAcceptors = acceptors.filter((a) => a.riskLevel === 'critical').length
  const highRiskAcceptors = acceptors.filter((a) => a.riskLevel === 'high').length
  const poorPerformance = acceptors.filter((a) => a.performance === 'poor' || a.performance === 'warning').length
  const avgDishonorRate = (acceptors.reduce((s, a) => s + a.dishonorRate, 0) / acceptors.length).toFixed(2)

  const columns: Column<Acceptor>[] = [
    {
      key: 'name',
      title: '承兑人',
      dataIndex: 'name',
      render: (v, record) => (
        <button
          className="text-left flex items-center gap-1 text-[var(--color-primary)] hover:underline font-medium"
          onClick={() => setSelectedAcceptor(record)}
        >
          <Building2 size={14} />
          {v}
          <ChevronRight size={14} />
        </button>
      ),
    },
    { key: 'industry', title: '所属行业', dataIndex: 'industry',
      render: (v) => <Tag><Briefcase size={10} className="mr-1" />{v}</Tag> },
    { key: 'region', title: '所在地区', dataIndex: 'region',
      render: (v) => <span className="flex items-center gap-1"><MapPin size={12} className="text-[var(--color-text-muted)]" />{v}</span> },
    { key: 'totalBills', title: '累计票据', dataIndex: 'totalBills', align: 'center' },
    { key: 'pendingCount', title: '在库数量', dataIndex: 'pendingCount', align: 'center',
      render: (v) => v > 0 ? <b>{v}</b> : v },
    { key: 'pendingAmount', title: '在库金额', dataIndex: 'pendingAmount', align: 'right',
      render: (v) => formatAmount(v) },
    { key: 'dishonorRate', title: '拒付率', dataIndex: 'dishonorRate', align: 'center',
      render: (v) => {
        if (v >= 5) return <span className="text-[var(--color-danger)] font-medium">{v}%</span>
        if (v >= 2) return <span className="text-[var(--color-warning)] font-medium">{v}%</span>
        return <span className="text-[var(--color-success)]">{v}%</span>
      }
    },
    { key: 'avgPaymentDays', title: '平均兑付天数', dataIndex: 'avgPaymentDays', align: 'center',
      render: (v) => `${v} 天` },
    { key: 'performance', title: '兑付表现', dataIndex: 'performance',
      render: (v) => <PerformanceTag level={v} /> },
    { key: 'riskLevel', title: '风险等级', dataIndex: 'riskLevel',
      render: (v) => <RiskTag level={v} /> },
  ]

  const renderRiskBar = (level: number, maxLevel: number = 5) => {
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: maxLevel }).map((_, i) => (
          <div
            key={i}
            className={`w-8 h-2 rounded-sm ${
              i < level
                ? level <= 1
                  ? 'bg-[var(--color-success)]'
                  : level <= 2
                  ? 'bg-[var(--color-info-light)]'
                  : level <= 3
                  ? 'bg-[var(--color-warning-light)]'
                  : level <= 4
                  ? 'bg-[var(--color-danger-light)]'
                  : 'bg-[var(--color-danger)]'
                : 'bg-[var(--color-border)]'
            }`}
          />
        ))}
      </div>
    )
  }

  const getRiskLevelIndex = (level: string) => {
    const map: Record<string, number> = { low: 1, medium: 2, high: 4, critical: 5 }
    return map[level] || 1
  }

  const getPerformanceIndex = (level: string) => {
    const map: Record<string, number> = { excellent: 1, good: 2, normal: 3, warning: 4, poor: 5 }
    return map[level] || 3
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="grid grid-cols-4 gap-3">
        <StatCard title="极高风险承兑人" value={criticalAcceptors} icon={AlertTriangle} iconColor="danger" subValue="需重点关注" />
        <StatCard title="高风险承兑人" value={highRiskAcceptors} icon={TrendingDown} iconColor="warning" />
        <StatCard title="兑付表现预警" value={poorPerformance} icon={BarChart3} iconColor="warning" />
        <StatCard title="平均拒付率" value={`${avgDishonorRate}%`} icon={AlertTriangle} iconColor="info" />
      </div>

      <Card title="承兑人风险画像" className="flex-1 min-h-0" bodyClassName="h-full flex flex-col">
        <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-[var(--color-border)]">
          <Input
            placeholder="搜索承兑人名称、统一社会信用代码、行业..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-72"
            prefix={<Search size={14} />}
          />
          <Select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            options={[
              { value: 'all', label: '全部风险等级' },
              { value: 'critical', label: '极高风险' },
              { value: 'high', label: '高风险' },
              { value: 'medium', label: '中风险' },
              { value: 'low', label: '低风险' },
            ]}
          />
          <Select
            value={performanceFilter}
            onChange={(e) => setPerformanceFilter(e.target.value)}
            options={[
              { value: 'all', label: '全部兑付表现' },
              { value: 'excellent', label: '优秀' },
              { value: 'good', label: '良好' },
              { value: 'normal', label: '正常' },
              { value: 'warning', label: '预警' },
              { value: 'poor', label: '较差' },
            ]}
          />
          <div className="flex-1" />
          <Button variant="outline" size="sm" icon={<FileText size={14} />}>
            导出风险名单
          </Button>
        </div>

        <div className="flex-1 overflow-auto min-h-0">
          <Table columns={columns} data={filteredAcceptors} />
        </div>
      </Card>

      <Modal
        open={!!selectedAcceptor}
        title={
          <div className="flex items-center gap-3">
            <Building2 size={20} className="text-[var(--color-primary)]" />
            {selectedAcceptor?.name}
            {selectedAcceptor && <RiskTag level={selectedAcceptor.riskLevel} />}
          </div>
        }
        width={900}
        onClose={() => setSelectedAcceptor(null)}
        footer={
          <div className="flex justify-between w-full">
            <Button variant="outline" icon={<FileText size={14} />}>查看完整风险报告</Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setSelectedAcceptor(null)}>关闭</Button>
              <Button variant="primary">加入重点监控</Button>
            </div>
          </div>
        }
      >
        {selectedAcceptor && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Card title="基础信息" padding="sm">
                <div className="space-y-2 text-sm">
                  <div className="flex"><span className="w-24 text-[var(--color-text-muted)] shrink-0">统一社会信用代码</span><span className="font-mono">{selectedAcceptor.creditCode}</span></div>
                  <div className="flex"><span className="w-24 text-[var(--color-text-muted)] shrink-0">所属行业</span><span>{selectedAcceptor.industry}</span></div>
                  <div className="flex"><span className="w-24 text-[var(--color-text-muted)] shrink-0">所在地区</span><span>{selectedAcceptor.region}</span></div>
                </div>
              </Card>

              <Card title="风险评估" padding="sm">
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-[var(--color-text-muted)]">综合风险等级</span>
                      <RiskTag level={selectedAcceptor.riskLevel} />
                    </div>
                    {renderRiskBar(getRiskLevelIndex(selectedAcceptor.riskLevel))}
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-[var(--color-text-muted)]">兑付表现评级</span>
                      <PerformanceTag level={selectedAcceptor.performance} />
                    </div>
                    {renderRiskBar(getPerformanceIndex(selectedAcceptor.performance))}
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="p-4 rounded bg-[var(--color-bg-tertiary)]">
                <div className="text-xs text-[var(--color-text-muted)] mb-1">累计票据</div>
                <div className="text-xl font-semibold">{selectedAcceptor.totalBills} 张</div>
                <div className="text-xs text-[var(--color-text-muted)] mt-1">{formatAmount(selectedAcceptor.totalAmount)} 元</div>
              </div>
              <div className="p-4 rounded bg-[var(--color-bg-tertiary)]">
                <div className="text-xs text-[var(--color-text-muted)] mb-1">在库票据</div>
                <div className="text-xl font-semibold">{selectedAcceptor.pendingCount} 张</div>
                <div className="text-xs text-[var(--color-text-muted)] mt-1">{formatAmount(selectedAcceptor.pendingAmount)} 元</div>
              </div>
              <div className="p-4 rounded bg-[var(--color-bg-tertiary)]">
                <div className="text-xs text-[var(--color-text-muted)] mb-1">累计拒付</div>
                <div className="text-xl font-semibold text-[var(--color-danger)]">{selectedAcceptor.dishonorCount} 次</div>
                <div className="text-xs text-[var(--color-text-muted)] mt-1">拒付率 {selectedAcceptor.dishonorRate}%</div>
              </div>
              <div className="p-4 rounded bg-[var(--color-bg-tertiary)]">
                <div className="text-xs text-[var(--color-text-muted)] mb-1">平均兑付时长</div>
                <div className="text-xl font-semibold">{selectedAcceptor.avgPaymentDays} 天</div>
                <div className="text-xs text-[var(--color-text-muted)] mt-1"><Clock size={10} className="inline mr-0.5" />上次兑付 {selectedAcceptor.lastPaymentDate || '—'}</div>
              </div>
            </div>

            {selectedAcceptor.concentratedDueCount && selectedAcceptor.concentratedDueCount >= 3 && (
              <div className="p-4 rounded border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)]">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-[var(--color-warning)]" />
                  <span className="font-medium text-[var(--color-warning)]">集中到期风险预警</span>
                </div>
                <div className="text-sm text-[var(--color-text-secondary)]">
                  <b className="text-[var(--color-danger)]">{selectedAcceptor.concentratedDueCount}</b> 张票据将于{' '}
                  <b>{selectedAcceptor.concentratedDueDate}</b> 前后集中到期，
                  合计金额 <b>{formatAmount(selectedAcceptor.concentratedDueAmount || 0)}</b> 元，建议提前做好兑付准备。
                </div>
              </div>
            )}

            <Card title={`在库票据清单（${acceptorBills.length}）`} padding="none">
              <div className="max-h-52 overflow-auto">
                <Table
                  columns={[
                    { key: 'billNo', title: '票据号码', dataIndex: 'billNo', render: (v) => <span className="font-mono text-xs">{v}</span> },
                    { key: 'amount', title: '票面金额', dataIndex: 'amount', align: 'right', render: (v) => formatAmountFull(v) },
                    { key: 'dueDate', title: '到期日期', dataIndex: 'dueDate' },
                    { key: 'daysToDue', title: '剩余天数', dataIndex: 'daysToDue', align: 'center',
                      render: (v) => v < 0 ? <span className="text-[var(--color-danger)]">逾期{v}天</span> : <span>{v}天</span> },
                    { key: 'status', title: '状态', dataIndex: 'status',
                      render: (v) => {
                        const map: Record<string, { color: string; label: string }> = {
                          holding: { color: 'default', label: '自持中' },
                          endorsed: { color: 'info', label: '已背书' },
                          pending_payment: { color: 'warning', label: '待付款' },
                          paid: { color: 'success', label: '已结清' },
                          dishonored: { color: 'danger', label: '已拒付' },
                          recourse: { color: 'danger', label: '追索中' },
                        }
                        const item = map[v] || { color: 'default', label: v }
                        return <Tag variant={item.color as any}>{item.label}</Tag>
                      }
                    },
                  ]}
                  data={acceptorBills.slice(0, 10)}
                />
              </div>
            </Card>

            {acceptorDishonors.length > 0 && (
              <Card title={`历史拒付记录（${acceptorDishonors.length}）`} padding="none">
                <div className="max-h-48 overflow-auto">
                  <Table
                    columns={[
                      { key: 'dishonorDate', title: '拒付日期', dataIndex: 'dishonorDate' },
                      { key: 'reasonCode', title: '拒付代码', dataIndex: 'reasonCode' },
                      { key: 'reason', title: '拒付理由', dataIndex: 'reason' },
                      { key: 'recourseStatus', title: '追索状态', dataIndex: 'recourseStatus',
                        render: (v) => {
                          const map: Record<string, { color: string; label: string }> = {
                            none: { color: 'default', label: '未追索' },
                            in_progress: { color: 'warning', label: '追索中' },
                            completed: { color: 'success', label: '追索完成' },
                            failed: { color: 'danger', label: '追索失败' },
                          }
                          const item = map[v] || { color: 'default', label: v }
                          return <Tag variant={item.color as any}>{item.label}</Tag>
                        }
                      },
                    ]}
                    data={acceptorDishonors}
                  />
                </div>
              </Card>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
