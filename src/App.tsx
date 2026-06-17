import React from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { useWorkbenchStore } from '@/store/workbench'
import { BatchImport } from '@/modules/BatchImport'
import { DueQueue } from '@/modules/DueQueue'
import { RiskProfile } from '@/modules/RiskProfile'
import { FollowPanel } from '@/modules/FollowPanel'
import { DisposalRecords } from '@/modules/DisposalRecords'
import { ManagementBoard } from '@/modules/ManagementBoard'

const moduleMap: Record<string, React.FC> = {
  'batch-import': BatchImport,
  'due-queue': DueQueue,
  'risk-profile': RiskProfile,
  'follow-panel': FollowPanel,
  'disposal-records': DisposalRecords,
  'management-board': ManagementBoard,
}

const App: React.FC = () => {
  const { activeModule } = useWorkbenchStore()
  const ActiveModule = moduleMap[activeModule] || DueQueue

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[var(--color-bg-primary)]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 min-h-0 overflow-hidden p-4">
          <ActiveModule />
        </main>
      </div>
    </div>
  )
}

export default App
