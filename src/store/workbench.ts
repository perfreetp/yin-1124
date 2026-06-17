import { create } from 'zustand'
import type {
  Bill,
  Acceptor,
  Manager,
  DisposalRecord,
  PaymentPrompt,
  DishonorRecord,
  Assignment,
  DailyPriority,
  RiskReport,
  ImportLog,
  BillStatus,
  DisposalType,
} from '@/types'
import {
  mockBills,
  mockAcceptors,
  mockManagers,
  mockDisposalRecords,
  mockPaymentPrompts,
  mockDishonorRecords,
  mockAssignments,
  mockDailyPriority,
  mockRiskReports,
  mockImportLogs,
} from '@/data/mockData'
import dayjs from 'dayjs'

interface WorkbenchState {
  bills: Bill[]
  acceptors: Acceptor[]
  managers: Manager[]
  disposalRecords: DisposalRecord[]
  paymentPrompts: PaymentPrompt[]
  dishonorRecords: DishonorRecord[]
  assignments: Assignment[]
  dailyPriority: DailyPriority
  riskReports: RiskReport[]
  importLogs: ImportLog[]
  activeModule: string
  selectedBillIds: string[]

  setActiveModule: (module: string) => void
  toggleBillSelection: (billId: string) => void
  clearBillSelection: () => void
  selectAllBills: (billIds: string[]) => void

  addDisposalRecord: (data: {
    billId: string
    billNo: string
    type: DisposalType
    action: string
    detail?: string
  }) => void

  updateBillStatus: (billId: string, status: BillStatus) => void
  assignBillToManager: (billId: string, managerId: string, managerName: string) => void
  markAsReviewed: (billId: string, approved: boolean) => void

  addPaymentPrompt: (data: {
    billId: string
    promptMethod: 'bank' | 'system' | 'manual'
  }) => void

  updatePaymentFeedback: (
    promptId: string,
    data: {
      feedbackStatus: 'paid' | 'dishonored' | 'pending' | 'partial'
      feedbackAmount?: number
      feedbackNote?: string
    }
  ) => void

  addDishonorRecord: (data: {
    billId: string
    reason: string
    reasonCode: string
  }) => void

  updateRecourseStatus: (
    dishonorId: string,
    data: {
      recourseStatus: 'none' | 'in_progress' | 'completed' | 'failed'
      recourseAmount?: number
      recourseNote?: string
    }
  ) => void

  importBills: (bills: Bill[], fileName: string, operator: string) => { success: number; failed: number }
}

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  bills: mockBills,
  acceptors: mockAcceptors,
  managers: mockManagers,
  disposalRecords: mockDisposalRecords,
  paymentPrompts: mockPaymentPrompts,
  dishonorRecords: mockDishonorRecords,
  assignments: mockAssignments,
  dailyPriority: mockDailyPriority,
  riskReports: mockRiskReports,
  importLogs: mockImportLogs,
  activeModule: 'due-queue',
  selectedBillIds: [],

  setActiveModule: (module) => set({ activeModule: module }),

  toggleBillSelection: (billId) =>
    set((state) => ({
      selectedBillIds: state.selectedBillIds.includes(billId)
        ? state.selectedBillIds.filter((id) => id !== billId)
        : [...state.selectedBillIds, billId],
    })),

  clearBillSelection: () => set({ selectedBillIds: [] }),

  selectAllBills: (billIds) => set({ selectedBillIds: billIds }),

  addDisposalRecord: (data) => {
    const newRecord: DisposalRecord = {
      id: `rec${String(Date.now()).padStart(6, '0')}`,
      ...data,
      operatorId: 'm001',
      operatorName: '当前用户',
      operatorRole: 'operation',
      createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      ipAddress: '192.168.1.100',
    }
    set((state) => ({
      disposalRecords: [newRecord, ...state.disposalRecords],
    }))
  },

  updateBillStatus: (billId, status) => {
    const bill = get().bills.find((b) => b.id === billId)
    if (bill) {
      get().addDisposalRecord({
        billId,
        billNo: bill.billNo,
        type: 'status_change',
        action: `变更票据状态为：${getStatusLabel(status)}`,
      })
    }
    set((state) => ({
      bills: state.bills.map((b) =>
        b.id === billId ? { ...b, status, updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss') } : b
      ),
    }))
  },

  assignBillToManager: (billId, managerId, managerName) => {
    const bill = get().bills.find((b) => b.id === billId)
    if (bill) {
      get().addDisposalRecord({
        billId,
        billNo: bill.billNo,
        type: 'assignment',
        action: `分配给客户经理：${managerName}`,
      })
    }
    const newAssignment: Assignment = {
      id: `as${String(Date.now()).padStart(5, '0')}`,
      billId,
      managerId,
      managerName,
      assignedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      assignedBy: '当前用户',
      priority: 3,
      status: 'pending',
    }
    set((state) => ({
      bills: state.bills.map((b) =>
        b.id === billId ? { ...b, managerId, managerName, updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss') } : b
      ),
      assignments: [newAssignment, ...state.assignments],
    }))
  },

  markAsReviewed: (billId, approved) => {
    const bill = get().bills.find((b) => b.id === billId)
    if (bill) {
      get().addDisposalRecord({
        billId,
        billNo: bill.billNo,
        type: 'review',
        action: approved ? '复核通过' : '复核驳回',
      })
    }
    set((state) => ({
      bills: state.bills.map((b) =>
        b.id === billId
          ? { ...b, reviewed: true, reviewStatus: approved ? 'approved' : 'rejected', updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss') }
          : b
      ),
    }))
  },

  addPaymentPrompt: (data) => {
    const bill = get().bills.find((b) => b.id === data.billId)
    if (bill) {
      get().addDisposalRecord({
        billId: data.billId,
        billNo: bill.billNo,
        type: 'payment_prompt',
        action: `发起提示付款，方式：${data.promptMethod === 'bank' ? '银行渠道' : data.promptMethod === 'system' ? '系统自动' : '人工操作'}`,
      })
    }
    const newPrompt: PaymentPrompt = {
      id: `pp${String(Date.now()).padStart(5, '0')}`,
      billId: data.billId,
      promptDate: dayjs().format('YYYY-MM-DD'),
      promptMethod: data.promptMethod,
    }
    set((state) => ({
      paymentPrompts: [newPrompt, ...state.paymentPrompts],
      bills: state.bills.map((b) =>
        b.id === data.billId ? { ...b, status: 'pending_payment', updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss') } : b
      ),
    }))
  },

  updatePaymentFeedback: (promptId, data) => {
    const prompt = get().paymentPrompts.find((p) => p.id === promptId)
    if (prompt) {
      const bill = get().bills.find((b) => b.id === prompt.billId)
      if (bill) {
        get().addDisposalRecord({
          billId: prompt.billId,
          billNo: bill.billNo,
          type: 'payment_feedback',
          action: `登记付款反馈：${data.feedbackStatus === 'paid' ? '已付款' : data.feedbackStatus === 'dishonored' ? '已拒付' : data.feedbackStatus === 'partial' ? '部分付款' : '待处理'}`,
          detail: data.feedbackNote,
        })
      }
    }
    set((state) => ({
      paymentPrompts: state.paymentPrompts.map((p) =>
        p.id === promptId
          ? { ...p, feedbackDate: dayjs().format('YYYY-MM-DD'), ...data }
          : p
      ),
      bills: state.bills.map((b) =>
        b.id === prompt?.billId && data.feedbackStatus === 'paid'
          ? { ...b, status: 'paid', updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss') }
          : b
      ),
    }))
  },

  addDishonorRecord: (data) => {
    const bill = get().bills.find((b) => b.id === data.billId)
    if (bill) {
      get().addDisposalRecord({
        billId: data.billId,
        billNo: bill.billNo,
        type: 'dishonor_record',
        action: `登记拒付：${data.reason}`,
      })
    }
    const newRecord: DishonorRecord = {
      id: `dh${String(Date.now()).padStart(5, '0')}`,
      billId: data.billId,
      dishonorDate: dayjs().format('YYYY-MM-DD'),
      reason: data.reason,
      reasonCode: data.reasonCode,
      recourseStatus: 'none',
    }
    set((state) => ({
      dishonorRecords: [newRecord, ...state.dishonorRecords],
      bills: state.bills.map((b) =>
        b.id === data.billId ? { ...b, status: 'dishonored', updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss') } : b
      ),
    }))
  },

  updateRecourseStatus: (dishonorId, data) => {
    const record = get().dishonorRecords.find((d) => d.id === dishonorId)
    if (record) {
      const bill = get().bills.find((b) => b.id === record.billId)
      if (bill) {
        get().addDisposalRecord({
          billId: record.billId,
          billNo: bill.billNo,
          type: 'recourse_action',
          action: `更新追索状态：${data.recourseStatus === 'in_progress' ? '追索中' : data.recourseStatus === 'completed' ? '追索完成' : data.recourseStatus === 'failed' ? '追索失败' : '未追索'}`,
          detail: data.recourseNote,
        })
      }
    }
    set((state) => ({
      dishonorRecords: state.dishonorRecords.map((d) =>
        d.id === dishonorId
          ? { ...d, recourseDate: dayjs().format('YYYY-MM-DD'), ...data }
          : d
      ),
      bills: state.bills.map((b) =>
        b.id === record?.billId && data.recourseStatus === 'in_progress'
          ? { ...b, status: 'recourse', updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss') }
          : b
      ),
    }))
  },

  importBills: (bills, fileName, operator) => {
    let success = 0
    let failed = 0
    const errors: { row: number; message: string }[] = []
    const validBills: Bill[] = []

    bills.forEach((bill, index) => {
      if (bill.billNo && bill.amount > 0 && bill.dueDate) {
        validBills.push({
          ...bill,
          id: `bill${String(Date.now() + index).padStart(5, '0')}`,
          createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        })
        success++
      } else {
        failed++
        errors.push({ row: index + 1, message: '必要字段缺失或格式错误' })
      }
    })

    const importLog: ImportLog = {
      id: `imp${String(Date.now()).padStart(5, '0')}`,
      fileName,
      importTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      operator,
      totalCount: bills.length,
      successCount: success,
      failedCount: failed,
      errors: errors.length > 0 ? errors : undefined,
    }

    set((state) => ({
      bills: [...validBills, ...state.bills],
      importLogs: [importLog, ...state.importLogs],
    }))

    return { success, failed }
  },
}))

export function getStatusLabel(status: BillStatus): string {
  const map: Record<BillStatus, string> = {
    holding: '自持中',
    endorsed: '已背书',
    pending_payment: '待付款',
    paid: '已结清',
    dishonored: '已拒付',
    recourse: '追索中',
    closed: '已关闭',
  }
  return map[status] || status
}

export function getRiskLabel(level: string): string {
  const map: Record<string, string> = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
    critical: '极高风险',
  }
  return map[level] || level
}

export function getPerformanceLabel(level: string): string {
  const map: Record<string, string> = {
    excellent: '优秀',
    good: '良好',
    normal: '正常',
    warning: '预警',
    poor: '较差',
  }
  return map[level] || level
}

export function formatAmount(amount: number): string {
  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(2)}亿`
  }
  if (amount >= 10000) {
    return `${(amount / 10000).toFixed(0)}万`
  }
  return amount.toLocaleString()
}

export function formatAmountFull(amount: number): string {
  return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
