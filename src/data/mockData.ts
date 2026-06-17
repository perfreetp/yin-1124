import type { Bill, Acceptor, Manager, DisposalRecord, PaymentPrompt, DishonorRecord, Assignment, DailyPriority, RiskReport, ImportLog } from '@/types'
import dayjs from 'dayjs'

const generateBills = (): Bill[] => {
  const acceptors = [
    { id: 'acc001', name: '中航国际控股有限公司' },
    { id: 'acc002', name: '中铁建设集团有限公司' },
    { id: 'acc003', name: '恒大地产集团有限公司' },
    { id: 'acc004', name: '华夏幸福基业股份有限公司' },
    { id: 'acc005', name: '融创房地产集团有限公司' },
    { id: 'acc006', name: '中国建筑第八工程局' },
    { id: 'acc007', name: '绿地控股集团有限公司' },
    { id: 'acc008', name: '碧桂园控股有限公司' },
    { id: 'acc009', name: '苏宁易购集团股份有限公司' },
    { id: 'acc010', name: '山东魏桥创业集团有限公司' },
  ]
  const managers = [
    { id: 'm001', name: '张明远' },
    { id: 'm002', name: '李思琪' },
    { id: 'm003', name: '王建国' },
    { id: 'm004', name: '赵丽华' },
    { id: 'm005', name: '陈志强' },
  ]
  const statuses: Bill['status'][] = ['holding', 'endorsed', 'pending_payment', 'paid', 'dishonored', 'recourse']
  const bills: Bill[] = []
  
  for (let i = 1; i <= 120; i++) {
    const acceptor = acceptors[Math.floor(Math.random() * acceptors.length)]
    const manager = managers[Math.floor(Math.random() * managers.length)]
    const issueDate = dayjs().subtract(60 + Math.floor(Math.random() * 120), 'day')
    const dueDate = issueDate.add(180, 'day')
    const daysToDue = dueDate.diff(dayjs(), 'day')
    const isEndorsed = Math.random() > 0.6
    const amount = (Math.floor(Math.random() * 900) + 100) * 10000
    
    let riskLevel: Bill['riskLevel'] = 'low'
    if (daysToDue <= 7) riskLevel = 'high'
    else if (daysToDue <= 15) riskLevel = 'medium'
    if (['acc003', 'acc004', 'acc005'].includes(acceptor.id)) riskLevel = 'critical'
    
    let status: Bill['status'] = 'holding'
    if (daysToDue < 0 && Math.random() > 0.3) status = 'paid'
    else if (daysToDue < 0 && Math.random() > 0.5) status = 'dishonored'
    else if (daysToDue <= 10 && Math.random() > 0.4) status = 'pending_payment'
    if (isEndorsed && status === 'holding') status = 'endorsed'
    if (status === 'dishonored' && Math.random() > 0.5) status = 'recourse'
    
    bills.push({
      id: `bill${String(i).padStart(5, '0')}`,
      billNo: `EC${dayjs().format('YYYYMMDD')}${String(i).padStart(8, '0')}`,
      amount,
      issueDate: issueDate.format('YYYY-MM-DD'),
      dueDate: dueDate.format('YYYY-MM-DD'),
      daysToDue,
      acceptorId: acceptor.id,
      acceptorName: acceptor.name,
      drawer: `出票企业${Math.floor(Math.random() * 50) + 1}有限公司`,
      payee: `收款企业${Math.floor(Math.random() * 30) + 1}有限公司`,
      status,
      holdType: isEndorsed ? 'endorsed' : 'self_held',
      endorsementDate: isEndorsed ? dayjs().subtract(Math.floor(Math.random() * 30), 'day').format('YYYY-MM-DD') : undefined,
      endorseTo: isEndorsed ? `被背书企业${Math.floor(Math.random() * 20) + 1}有限公司` : undefined,
      managerId: manager.id,
      managerName: manager.name,
      requiresReview: amount >= 5000000,
      reviewed: amount < 5000000 || Math.random() > 0.3,
      reviewStatus: amount >= 5000000 ? (Math.random() > 0.3 ? 'approved' : 'pending') : undefined,
      riskLevel,
      tags: [],
      createdAt: dayjs().subtract(Math.floor(Math.random() * 60), 'day').format('YYYY-MM-DD HH:mm:ss'),
      updatedAt: dayjs().subtract(Math.floor(Math.random() * 10), 'day').format('YYYY-MM-DD HH:mm:ss'),
    })
  }
  return bills
}

const generateAcceptors = (): Acceptor[] => {
  const data: Array<Omit<Acceptor, 'pendingCount' | 'pendingAmount' | 'dishonorCount' | 'dishonorRate' | 'avgPaymentDays' | 'performance' | 'riskLevel' | 'totalBills' | 'totalAmount'>> = [
    { id: 'acc001', name: '中航国际控股有限公司', creditCode: '91110000100001234X', industry: '航空航天', region: '北京' },
    { id: 'acc002', name: '中铁建设集团有限公司', creditCode: '91110000100005678X', industry: '建筑工程', region: '北京' },
    { id: 'acc003', name: '恒大地产集团有限公司', creditCode: '91440000100009012X', industry: '房地产', region: '广东' },
    { id: 'acc004', name: '华夏幸福基业股份有限公司', creditCode: '91130000100003456X', industry: '房地产', region: '河北' },
    { id: 'acc005', name: '融创房地产集团有限公司', creditCode: '91120000100007890X', industry: '房地产', region: '天津' },
    { id: 'acc006', name: '中国建筑第八工程局', creditCode: '91310000100002345X', industry: '建筑工程', region: '上海' },
    { id: 'acc007', name: '绿地控股集团有限公司', creditCode: '91310000100006789X', industry: '房地产', region: '上海' },
    { id: 'acc008', name: '碧桂园控股有限公司', creditCode: '91440000100001122X', industry: '房地产', region: '广东' },
    { id: 'acc009', name: '苏宁易购集团股份有限公司', creditCode: '91320000100003344X', industry: '零售', region: '江苏' },
    { id: 'acc010', name: '山东魏桥创业集团有限公司', creditCode: '91370000100005566X', industry: '制造业', region: '山东' },
  ]
  return data.map(item => ({
    ...item,
    totalBills: Math.floor(Math.random() * 80) + 10,
    totalAmount: (Math.floor(Math.random() * 9000) + 1000) * 10000,
    pendingCount: Math.floor(Math.random() * 30),
    pendingAmount: (Math.floor(Math.random() * 3000) + 100) * 10000,
    dishonorCount: Math.floor(Math.random() * 10),
    dishonorRate: parseFloat((Math.random() * 8).toFixed(2)),
    avgPaymentDays: Math.floor(Math.random() * 15) + 1,
    performance: (['excellent', 'good', 'normal', 'warning', 'poor'] as const)[Math.floor(Math.random() * 5)],
    riskLevel: (['low', 'medium', 'high', 'critical'] as const)[Math.floor(Math.random() * 4)],
    concentratedDueDate: dayjs().add(Math.floor(Math.random() * 60), 'day').format('YYYY-MM-DD'),
    concentratedDueCount: Math.floor(Math.random() * 20) + 3,
    concentratedDueAmount: (Math.floor(Math.random() * 2000) + 200) * 10000,
  }))
}

const generateManagers = (): Manager[] => {
  const data = [
    { id: 'm001', name: '张明远', department: '运营一部' },
    { id: 'm002', name: '李思琪', department: '运营一部' },
    { id: 'm003', name: '王建国', department: '运营二部' },
    { id: 'm004', name: '赵丽华', department: '运营二部' },
    { id: 'm005', name: '陈志强', department: '风险部' },
  ]
  return data.map(item => ({
    ...item,
    billCount: Math.floor(Math.random() * 80) + 20,
    pendingCount: Math.floor(Math.random() * 30) + 5,
    completedCount: Math.floor(Math.random() * 60) + 10,
  }))
}

const generateDisposalRecords = (): DisposalRecord[] => {
  const records: DisposalRecord[] = []
  const actions = {
    import: ['批量导入票据清单'],
    status_change: ['变更票据状态', '更新持有类型', '标记已付款'],
    payment_prompt: ['发起提示付款', '再次提示付款'],
    payment_feedback: ['登记付款反馈', '更新付款金额'],
    dishonor_record: ['登记拒付记录', '补充拒付理由'],
    recourse_action: ['启动追索程序', '更新追索进度', '完成追索'],
    review: ['提交风险复核', '复核通过', '复核驳回'],
    assignment: ['分配客户经理', '调整跟单优先级'],
    note: ['添加备注', '补充说明'],
  }
  for (let i = 1; i <= 200; i++) {
    const types = Object.keys(actions) as (keyof typeof actions)[]
    const type = types[Math.floor(Math.random() * types.length)]
    const actionList = actions[type]
    records.push({
      id: `rec${String(i).padStart(6, '0')}`,
      billId: `bill${String(Math.floor(Math.random() * 120) + 1).padStart(5, '0')}`,
      billNo: `EC${dayjs().format('YYYYMMDD')}${String(Math.floor(Math.random() * 120) + 1).padStart(8, '0')}`,
      type,
      operatorId: `m00${Math.floor(Math.random() * 5) + 1}`,
      operatorName: ['张明远', '李思琪', '王建国', '赵丽华', '陈志强'][Math.floor(Math.random() * 5)],
      operatorRole: ['operation', 'risk', 'admin'][Math.floor(Math.random() * 3)] as DisposalRecord['operatorRole'],
      action: actionList[Math.floor(Math.random() * actionList.length)],
      detail: Math.random() > 0.5 ? '系统自动记录操作详情，包含操作前后数据对比' : undefined,
      createdAt: dayjs().subtract(Math.floor(Math.random() * 24 * 30), 'hour').format('YYYY-MM-DD HH:mm:ss'),
      ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    })
  }
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

const generatePaymentPrompts = (): PaymentPrompt[] => {
  const prompts: PaymentPrompt[] = []
  for (let i = 1; i <= 50; i++) {
    const billId = `bill${String(Math.floor(Math.random() * 120) + 1).padStart(5, '0')}`
    const promptDate = dayjs().subtract(Math.floor(Math.random() * 20), 'day')
    const hasFeedback = Math.random() > 0.3
    prompts.push({
      id: `pp${String(i).padStart(5, '0')}`,
      billId,
      promptDate: promptDate.format('YYYY-MM-DD'),
      promptMethod: (['bank', 'system', 'manual'] as const)[Math.floor(Math.random() * 3)],
      feedbackDate: hasFeedback ? promptDate.add(Math.floor(Math.random() * 5), 'day').format('YYYY-MM-DD') : undefined,
      feedbackStatus: hasFeedback ? (['paid', 'dishonored', 'pending', 'partial'] as const)[Math.floor(Math.random() * 4)] : undefined,
      feedbackAmount: hasFeedback ? (Math.floor(Math.random() * 900) + 100) * 10000 : undefined,
      feedbackNote: hasFeedback && Math.random() > 0.5 ? '承兑人反馈正常，已安排付款' : undefined,
    })
  }
  return prompts
}

const generateDishonorRecords = (): DishonorRecord[] => {
  const reasons = [
    { code: 'DR001', reason: '承兑人账户余额不足' },
    { code: 'DR002', reason: '票据要素不符' },
    { code: 'DR003', reason: '承兑人拒付' },
    { code: 'DR004', reason: '司法冻结' },
    { code: 'DR005', reason: '其他原因' },
  ]
  const records: DishonorRecord[] = []
  for (let i = 1; i <= 20; i++) {
    const r = reasons[Math.floor(Math.random() * reasons.length)]
    records.push({
      id: `dh${String(i).padStart(5, '0')}`,
      billId: `bill${String(Math.floor(Math.random() * 120) + 1).padStart(5, '0')}`,
      dishonorDate: dayjs().subtract(Math.floor(Math.random() * 60), 'day').format('YYYY-MM-DD'),
      reason: r.reason,
      reasonCode: r.code,
      recourseStatus: (['none', 'in_progress', 'completed', 'failed'] as const)[Math.floor(Math.random() * 4)],
      recourseDate: Math.random() > 0.5 ? dayjs().subtract(Math.floor(Math.random() * 30), 'day').format('YYYY-MM-DD') : undefined,
      recourseAmount: Math.random() > 0.5 ? (Math.floor(Math.random() * 900) + 100) * 10000 : undefined,
      recourseNote: Math.random() > 0.5 ? '已与前手沟通，正在推进追索流程' : undefined,
    })
  }
  return records
}

const generateAssignments = (): Assignment[] => {
  const assignments: Assignment[] = []
  for (let i = 1; i <= 60; i++) {
    assignments.push({
      id: `as${String(i).padStart(5, '0')}`,
      billId: `bill${String(Math.floor(Math.random() * 120) + 1).padStart(5, '0')}`,
      managerId: `m00${Math.floor(Math.random() * 5) + 1}`,
      managerName: ['张明远', '李思琪', '王建国', '赵丽华', '陈志强'][Math.floor(Math.random() * 5)],
      assignedAt: dayjs().subtract(Math.floor(Math.random() * 30), 'day').format('YYYY-MM-DD HH:mm:ss'),
      assignedBy: ['管理员', '李总监', '陈志强'][Math.floor(Math.random() * 3)],
      priority: (Math.floor(Math.random() * 5) + 1) as 1 | 2 | 3 | 4 | 5,
      deadline: dayjs().add(Math.floor(Math.random() * 15), 'day').format('YYYY-MM-DD'),
      status: (['pending', 'in_progress', 'completed'] as const)[Math.floor(Math.random() * 3)],
    })
  }
  return assignments
}

const generateDailyPriority = (): DailyPriority => {
  const rankings: DailyPriority['rankings'] = []
  for (let i = 1; i <= 20; i++) {
    const reasons: string[] = []
    const daysToDue = Math.floor(Math.random() * 30) - 5
    if (daysToDue <= 3) reasons.push('临期票据')
    if (daysToDue <= 0) reasons.push('已到期')
    if (i <= 3) reasons.push('高风险承兑人')
    if (Math.random() > 0.5) reasons.push('大额票据')
    if (Math.random() > 0.7) reasons.push('集中到期日')
    rankings.push({
      billId: `bill${String(i).padStart(5, '0')}`,
      billNo: `EC${dayjs().format('YYYYMMDD')}${String(i).padStart(8, '0')}`,
      acceptorName: ['中航国际控股有限公司', '中铁建设集团有限公司', '恒大地产集团有限公司', '华夏幸福基业股份有限公司'][Math.floor(Math.random() * 4)],
      amount: (Math.floor(Math.random() * 900) + 100) * 10000,
      dueDate: dayjs().add(daysToDue, 'day').format('YYYY-MM-DD'),
      priorityScore: Math.floor(Math.random() * 50) + 50,
      reasons: reasons.length > 0 ? reasons : ['常规处置'],
    })
  }
  return {
    date: dayjs().format('YYYY-MM-DD'),
    rankings: rankings.sort((a, b) => b.priorityScore - a.priorityScore),
  }
}

const generateRiskReports = (): RiskReport[] => {
  const reports: RiskReport[] = []
  const periods: RiskReport['period'][] = ['daily', 'weekly', 'monthly']
  for (let i = 0; i < 10; i++) {
    reports.push({
      id: `rpt${String(i + 1).padStart(5, '0')}`,
      reportDate: dayjs().subtract(i, 'day').format('YYYY-MM-DD'),
      period: periods[i % 3],
      totalBills: Math.floor(Math.random() * 50) + 100,
      totalAmount: (Math.floor(Math.random() * 5000) + 8000) * 10000,
      highRiskCount: Math.floor(Math.random() * 20) + 5,
      highRiskAmount: (Math.floor(Math.random() * 2000) + 500) * 10000,
      dishonorCount: Math.floor(Math.random() * 8) + 1,
      dishonorAmount: (Math.floor(Math.random() * 800) + 100) * 10000,
      concentratedRisks: [
        { acceptorId: 'acc003', acceptorName: '恒大地产集团有限公司', count: 15, amount: 85000000, dueDateRange: '2026-06-20 ~ 2026-06-30' },
        { acceptorId: 'acc005', acceptorName: '融创房地产集团有限公司', count: 8, amount: 42000000, dueDateRange: '2026-06-25 ~ 2026-07-10' },
      ],
      recommendations: [
        '建议对恒大地产到期票据提前7天启动提示付款',
        '融创房地产集中度较高，建议控制新增规模',
        '高风险承兑人票据建议优先转让',
      ],
    })
  }
  return reports
}

export const mockBills = generateBills()
export const mockAcceptors = generateAcceptors()
export const mockManagers = generateManagers()
export const mockDisposalRecords = generateDisposalRecords()
export const mockPaymentPrompts = generatePaymentPrompts()
export const mockDishonorRecords = generateDishonorRecords()
export const mockAssignments = generateAssignments()
export const mockDailyPriority = generateDailyPriority()
export const mockRiskReports = generateRiskReports()
export const mockImportLogs: ImportLog[] = [
  { id: 'imp001', fileName: '2026年6月票据清单.xlsx', importTime: '2026-06-15 09:30:22', operator: '张明远', totalCount: 45, successCount: 43, failedCount: 2, errors: [{ row: 12, message: '票据号格式不正确' }, { row: 28, message: '到期日期格式错误' }] },
  { id: 'imp002', fileName: '2026年6月第二批.xlsx', importTime: '2026-06-14 14:20:15', operator: '李思琪', totalCount: 32, successCount: 32, failedCount: 0 },
  { id: 'imp003', fileName: '补录票据0610.xlsx', importTime: '2026-06-10 16:45:33', operator: '王建国', totalCount: 18, successCount: 17, failedCount: 1, errors: [{ row: 5, message: '承兑人信息不匹配' }] },
]
