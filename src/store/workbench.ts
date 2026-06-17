import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
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

const STORAGE_KEY = 'bill-workbench-state-v1'
const PERSIST_KEYS = [
  'bills',
  'disposalRecords',
  'paymentPrompts',
  'dishonorRecords',
  'assignments',
  'importLogs',
  'selectedBillIds',
] as const

type PersistState = Pick<WorkbenchState, typeof PERSIST_KEYS[number]>

function loadPersistedState(): Partial<PersistState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed
  } catch (e) {
    console.warn('Failed to load persisted state', e)
    return null
  }
}

function savePersistedState(state: PersistState) {
  try {
    const toSave: Record<string, any> = {}
    PERSIST_KEYS.forEach((key) => {
      toSave[key] = state[key]
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch (e) {
    console.warn('Failed to persist state', e)
  }
}

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
  assignBillToManager: (billId: string, managerId: string, managerName: string, options?: { priority?: 1 | 2 | 3 | 4 | 5; note?: string }) => void
  batchAssignToManager: (billIds: string[], managerId: string, managerName: string, options?: { priority?: 1 | 2 | 3 | 4 | 5; note?: string }) => void
  markAsReviewed: (billId: string, approved: boolean) => void

  addPaymentPrompt: (data: {
    billId: string
    promptMethod: 'bank' | 'system' | 'manual'
  }) => void
  batchAddPaymentPrompt: (billIds: string[], promptMethod: 'bank' | 'system' | 'manual') => { success: number }

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

  importBills: (bills: Bill[], fileName: string, operator: string, acceptorMap?: Map<string, Acceptor>) => { success: number; failed: number }
}

const getInitialState = (): Omit<WorkbenchState,
  | 'setActiveModule'
  | 'toggleBillSelection'
  | 'clearBillSelection'
  | 'selectAllBills'
  | 'addDisposalRecord'
  | 'updateBillStatus'
  | 'assignBillToManager'
  | 'batchAssignToManager'
  | 'markAsReviewed'
  | 'addPaymentPrompt'
  | 'batchAddPaymentPrompt'
  | 'updatePaymentFeedback'
  | 'addDishonorRecord'
  | 'updateRecourseStatus'
  | 'importBills'
> => {
  const persisted = loadPersistedState()
  return {
    bills: persisted?.bills ?? mockBills,
    acceptors: mockAcceptors,
    managers: mockManagers,
    disposalRecords: persisted?.disposalRecords ?? mockDisposalRecords,
    paymentPrompts: persisted?.paymentPrompts ?? mockPaymentPrompts,
    dishonorRecords: persisted?.dishonorRecords ?? mockDishonorRecords,
    assignments: persisted?.assignments ?? mockAssignments,
    dailyPriority: mockDailyPriority,
    riskReports: mockRiskReports,
    importLogs: persisted?.importLogs ?? mockImportLogs,
    activeModule: 'due-queue',
    selectedBillIds: persisted?.selectedBillIds ?? [],
  }
}

export const useWorkbenchStore = create<WorkbenchState>()(
  subscribeWithSelector((set, get) => ({
    ...getInitialState(),

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
        id: `rec${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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

    assignBillToManager: (billId, managerId, managerName, options = {}) => {
      const bill = get().bills.find((b) => b.id === billId)
      const priority = options.priority ?? 3
      if (bill) {
        get().addDisposalRecord({
          billId,
          billNo: bill.billNo,
          type: 'assignment',
          action: `分配给客户经理：${managerName}（优先级 ${priority} 级）`,
          detail: options.note,
        })
      }
      const newAssignment: Assignment = {
        id: `as${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        billId,
        managerId,
        managerName,
        assignedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        assignedBy: '当前用户',
        priority,
        status: 'pending',
        note: options.note,
      }
      set((state) => ({
        bills: state.bills.map((b) =>
          b.id === billId ? { ...b, managerId, managerName, updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss') } : b
        ),
        assignments: [newAssignment, ...state.assignments],
      }))
    },

    batchAssignToManager: (billIds, managerId, managerName, options = {}) => {
      const priority = options.priority ?? 3
      const newAssignments: Assignment[] = []
      const updatedBills = new Map<string, Bill>()
      const recordsToAdd: DisposalRecord[] = []

      billIds.forEach((billId, idx) => {
        const bill = get().bills.find((b) => b.id === billId)
        if (!bill) return
        newAssignments.push({
          id: `as${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 4)}`,
          billId,
          managerId,
          managerName,
          assignedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          assignedBy: '当前用户',
          priority,
          status: 'pending',
          note: options.note,
        })
        updatedBills.set(billId, { ...bill, managerId, managerName, updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss') })
        recordsToAdd.push({
          id: `rec${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 4)}`,
          billId,
          billNo: bill.billNo,
          type: 'assignment',
          action: `分配给客户经理：${managerName}（优先级 ${priority} 级，批量）`,
          detail: options.note,
          operatorId: 'm001',
          operatorName: '当前用户',
          operatorRole: 'operation',
          createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          ipAddress: '192.168.1.100',
        })
      })

      set((state) => ({
        bills: state.bills.map((b) => updatedBills.get(b.id) || b),
        assignments: [...newAssignments, ...state.assignments],
        disposalRecords: [...recordsToAdd, ...state.disposalRecords],
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
        id: `pp${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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

    batchAddPaymentPrompt: (billIds, promptMethod) => {
      const newPrompts: PaymentPrompt[] = []
      const updatedBills = new Map<string, Bill>()
      const recordsToAdd: DisposalRecord[] = []
      let success = 0

      const methodLabel = promptMethod === 'bank' ? '银行渠道' : promptMethod === 'system' ? '系统自动' : '人工操作'

      billIds.forEach((billId, idx) => {
        const bill = get().bills.find((b) => b.id === billId)
        if (!bill) return
        if (bill.status === 'paid' || bill.status === 'closed') return
        newPrompts.push({
          id: `pp${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 4)}`,
          billId,
          promptDate: dayjs().format('YYYY-MM-DD'),
          promptMethod,
        })
        updatedBills.set(billId, { ...bill, status: 'pending_payment', updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss') })
        recordsToAdd.push({
          id: `rec${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 4)}`,
          billId,
          billNo: bill.billNo,
          type: 'payment_prompt',
          action: `发起提示付款，方式：${methodLabel}（批量）`,
          detail: `来自批量提示付款操作，共处理 ${billIds.length} 张`,
          operatorId: 'm001',
          operatorName: '当前用户',
          operatorRole: 'operation',
          createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          ipAddress: '192.168.1.100',
        })
        success++
      })

      set((state) => ({
        paymentPrompts: [...newPrompts, ...state.paymentPrompts],
        bills: state.bills.map((b) => updatedBills.get(b.id) || b),
        disposalRecords: [...recordsToAdd, ...state.disposalRecords],
      }))

      return { success }
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
        id: `dh${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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

    importBills: (bills, fileName, operator, acceptorMap) => {
      let success = 0
      let failed = 0
      const errors: { row: number; message: string }[] = []
      const validBills: Bill[] = []
      const recordsToAdd: DisposalRecord[] = []
      const nowStr = dayjs().format('YYYY-MM-DD HH:mm:ss')
      const acceptorMapArg: Map<string, Acceptor> = acceptorMap || new Map()

      bills.forEach((bill, index) => {
        if (bill.billNo && bill.amount > 0 && bill.dueDate) {
          const newBill: Bill = {
            ...bill,
            id: `bill${Date.now()}-${index}-${Math.random().toString(36).slice(2, 4)}`,
            createdAt: nowStr,
            updatedAt: nowStr,
          }
          validBills.push(newBill)
          recordsToAdd.push({
            id: `rec${Date.now()}-${index}-${Math.random().toString(36).slice(2, 4)}`,
            billId: newBill.id,
            billNo: newBill.billNo,
            type: 'import',
            action: `票据入库（批量导入）`,
            detail: `文件：${fileName}；入库时间：${nowStr}`,
            operatorId: 'm001',
            operatorName: '当前用户',
            operatorRole: 'operation',
            createdAt: nowStr,
            ipAddress: '192.168.1.100',
          })
          success++
        } else {
          failed++
          errors.push({ row: index + 1, message: '必要字段缺失或格式错误' })
        }
      })

      const importLog: ImportLog = {
        id: `imp${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        fileName,
        importTime: nowStr,
        operator,
        totalCount: bills.length,
        successCount: success,
        failedCount: failed,
        errors: errors.length > 0 ? errors : undefined,
      }

      const updatedAcceptorMap = new Map(get().acceptors.map((a) => [a.name, a]))
      acceptorMapArg.forEach((acc) => updatedAcceptorMap.set(acc.name, acc))

      const newAcceptorsMap = new Map<string, Bill[]>()
      validBills.forEach((b) => {
        const key = b.acceptorName
        if (!newAcceptorsMap.has(key)) newAcceptorsMap.set(key, [])
        newAcceptorsMap.get(key)!.push(b)
      })

      const updatedAcceptors: Acceptor[] = get().acceptors.map((a) => ({ ...a }))
      newAcceptorsMap.forEach((accBills, accName) => {
        const existing = updatedAcceptors.find((a) => a.name === accName)
        if (existing) {
          const pendingBills = get().bills
            .filter((b) => b.acceptorName === accName && b.status !== 'paid' && b.status !== 'closed')
            .concat(accBills)
          existing.pendingCount = pendingBills.length
          existing.pendingAmount = pendingBills.reduce((s, b) => s + b.amount, 0)
          existing.totalBills = existing.totalBills + accBills.length
          existing.totalAmount = existing.totalAmount + accBills.reduce((s, b) => s + b.amount, 0)

          const dueDates = pendingBills
            .filter((b) => b.daysToDue >= 0 && b.daysToDue <= 30)
            .map((b) => b.dueDate)
          const concentratedCount = dueDates.length
          if (concentratedCount >= 3) {
            existing.concentratedDueCount = concentratedCount
            existing.concentratedDueDate = dueDates.sort()[0]
            existing.concentratedDueAmount = pendingBills
              .filter((b) => b.daysToDue >= 0 && b.daysToDue <= 30)
              .reduce((s, b) => s + b.amount, 0)
          }
        } else {
          const firstBill = accBills[0]
          updatedAcceptors.push({
            id: firstBill.acceptorId,
            name: accName,
            creditCode: `CREDIT_${Math.random().toString(36).slice(2, 12).toUpperCase()}`,
            industry: '未分类',
            region: '未分类',
            totalBills: accBills.length,
            totalAmount: accBills.reduce((s, b) => s + b.amount, 0),
            pendingCount: accBills.length,
            pendingAmount: accBills.reduce((s, b) => s + b.amount, 0),
            dishonorCount: 0,
            dishonorRate: 0,
            avgPaymentDays: 1,
            lastPaymentDate: dayjs().format('YYYY-MM-DD'),
            performance: 'normal',
            riskLevel: accBills.some((b) => b.riskLevel === 'critical')
              ? 'critical'
              : accBills.some((b) => b.riskLevel === 'high')
              ? 'high'
              : 'medium',
            tags: ['新入库承兑人'],
            concentratedDueCount: accBills.filter((b) => b.daysToDue >= 0 && b.daysToDue <= 30).length >= 3
              ? accBills.filter((b) => b.daysToDue >= 0 && b.daysToDue <= 30).length
              : undefined,
            concentratedDueDate: accBills.filter((b) => b.daysToDue >= 0 && b.daysToDue <= 30).length >= 3
              ? accBills.filter((b) => b.daysToDue >= 0 && b.daysToDue <= 30).map((b) => b.dueDate).sort()[0]
              : undefined,
            concentratedDueAmount: accBills.filter((b) => b.daysToDue >= 0 && b.daysToDue <= 30).length >= 3
              ? accBills.filter((b) => b.daysToDue >= 0 && b.daysToDue <= 30).reduce((s, b) => s + b.amount, 0)
              : undefined,
          })
        }
      })

      set((state) => ({
        bills: [...validBills, ...state.bills],
        importLogs: [importLog, ...state.importLogs],
        disposalRecords: [...recordsToAdd, ...state.disposalRecords],
        acceptors: updatedAcceptors,
      }))

      return { success, failed }
    },
  }))
)

useWorkbenchStore.subscribe(
  (state) => {
    const persistState: PersistState = {} as PersistState
    PERSIST_KEYS.forEach((key) => {
      ;(persistState as any)[key] = state[key]
    })
    savePersistedState(persistState)
  }
)

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
