export type BillStatus = 
  | 'holding' 
  | 'endorsed' 
  | 'pending_payment' 
  | 'paid' 
  | 'dishonored' 
  | 'recourse' 
  | 'closed'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type AcceptancePerformance = 'excellent' | 'good' | 'normal' | 'warning' | 'poor'

export type DisposalType = 
  | 'import'
  | 'status_change'
  | 'payment_prompt'
  | 'payment_feedback'
  | 'dishonor_record'
  | 'recourse_action'
  | 'review'
  | 'assignment'
  | 'note'

export interface Bill {
  id: string
  billNo: string
  amount: number
  issueDate: string
  dueDate: string
  daysToDue: number
  acceptorId: string
  acceptorName: string
  drawer: string
  payee: string
  status: BillStatus
  holdType: 'self_held' | 'endorsed'
  endorsementDate?: string
  endorseTo?: string
  managerId?: string
  managerName?: string
  requiresReview: boolean
  reviewed: boolean
  reviewStatus?: 'pending' | 'approved' | 'rejected'
  riskLevel: RiskLevel
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface Acceptor {
  id: string
  name: string
  creditCode: string
  industry: string
  region: string
  totalBills: number
  totalAmount: number
  pendingCount: number
  pendingAmount: number
  dishonorCount: number
  dishonorRate: number
  avgPaymentDays: number
  performance: AcceptancePerformance
  riskLevel: RiskLevel
  lastPaymentDate?: string
  lastDishonorDate?: string
  concentratedDueDate?: string
  concentratedDueCount?: number
  concentratedDueAmount?: number
}

export interface Manager {
  id: string
  name: string
  department: string
  billCount: number
  pendingCount: number
  completedCount: number
}

export interface DisposalRecord {
  id: string
  billId: string
  billNo: string
  type: DisposalType
  operatorId: string
  operatorName: string
  operatorRole: 'operation' | 'risk' | 'admin'
  action: string
  detail?: string
  createdAt: string
  ipAddress?: string
}

export interface PaymentPrompt {
  id: string
  billId: string
  promptDate: string
  promptMethod: 'bank' | 'system' | 'manual'
  feedbackDate?: string
  feedbackStatus?: 'paid' | 'dishonored' | 'pending' | 'partial'
  feedbackAmount?: number
  feedbackNote?: string
}

export interface DishonorRecord {
  id: string
  billId: string
  dishonorDate: string
  reason: string
  reasonCode: string
  recourseStatus: 'none' | 'in_progress' | 'completed' | 'failed'
  recourseDate?: string
  recourseAmount?: number
  recourseNote?: string
}

export interface Assignment {
  id: string
  billId: string
  managerId: string
  managerName: string
  assignedAt: string
  assignedBy: string
  priority: 1 | 2 | 3 | 4 | 5
  deadline?: string
  status: 'pending' | 'in_progress' | 'completed'
  note?: string
}

export interface DailyPriority {
  date: string
  rankings: {
    billId: string
    billNo: string
    acceptorName: string
    amount: number
    dueDate: string
    priorityScore: number
    reasons: string[]
  }[]
}

export interface RiskReport {
  id: string
  reportDate: string
  period: 'daily' | 'weekly' | 'monthly'
  totalBills: number
  totalAmount: number
  highRiskCount: number
  highRiskAmount: number
  dishonorCount: number
  dishonorAmount: number
  concentratedRisks: {
    acceptorId: string
    acceptorName: string
    count: number
    amount: number
    dueDateRange: string
  }[]
  recommendations: string[]
}

export interface ImportLog {
  id: string
  fileName: string
  importTime: string
  operator: string
  totalCount: number
  successCount: number
  failedCount: number
  errors?: { row: number; message: string }[]
}
