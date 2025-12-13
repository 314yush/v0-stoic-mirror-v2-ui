/**
 * Schedule Insights Component
 * Shows schedule score, optimizations, and conflicts in a compact panel
 */

import { useState, useEffect, useMemo } from 'react'
import type { TimeBlock } from '../../lib/schedule-store'
import type { CalendarEvent } from './day-timeline'
import { 
  scoreSchedule, 
  generateOptimizations, 
  applyOptimization,
  type ScheduleScore,
  type OptimizationSuggestion 
} from '../../lib/ai-schedule-optimizer'
import { 
  detectConflicts, 
  applyResolution,
  getConflictSummary,
  type Conflict,
  type ConflictResolution 
} from '../../lib/ai-conflict-resolver'
import { useSettingsStore } from '../../lib/settings-store'

interface ScheduleInsightsProps {
  blocks: TimeBlock[]
  calendarEvents: CalendarEvent[]
  onUpdateBlocks: (blocks: TimeBlock[]) => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function ScheduleInsights({
  blocks,
  calendarEvents,
  onUpdateBlocks,
  isCollapsed = false,
  onToggleCollapse,
}: ScheduleInsightsProps) {
  const [activeTab, setActiveTab] = useState<'score' | 'optimize' | 'conflicts'>('score')
  const { settings } = useSettingsStore()
  
  // Calculate score
  const score = useMemo(() => 
    scoreSchedule(blocks, calendarEvents, settings.northStarGoals?.split(',').map(s => s.trim())),
    [blocks, calendarEvents, settings.northStarGoals]
  )
  
  // Generate optimizations
  const optimizations = useMemo(() =>
    generateOptimizations(blocks, calendarEvents, settings.northStarGoals?.split(',').map(s => s.trim())),
    [blocks, calendarEvents, settings.northStarGoals]
  )
  
  // Detect conflicts
  const conflicts = useMemo(() =>
    detectConflicts(blocks, calendarEvents),
    [blocks, calendarEvents]
  )
  
  const conflictSummary = useMemo(() => getConflictSummary(conflicts), [conflicts])
  
  const handleApplyOptimization = (suggestion: OptimizationSuggestion) => {
    const newBlocks = applyOptimization(blocks, suggestion)
    onUpdateBlocks(newBlocks)
  }
  
  const handleApplyResolution = (resolution: ConflictResolution) => {
    const newBlocks = applyResolution(blocks, resolution)
    onUpdateBlocks(newBlocks)
  }
  
  // Get score color
  const getScoreColor = (value: number) => {
    if (value >= 80) return 'text-primary'
    if (value >= 60) return 'text-yellow-500'
    return 'text-destructive'
  }
  
  // Don't show if no blocks
  if (blocks.length === 0) return null
  
  return (
    <div className="bg-secondary/30 border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggleCollapse}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">📊</span>
          <span className="font-medium text-foreground text-sm">Schedule Insights</span>
          
          {/* Quick stats */}
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${getScoreColor(score.overall)}`}>
              Score: {score.overall}%
            </span>
            {conflictSummary.critical > 0 && (
              <span className="px-1.5 py-0.5 bg-destructive/20 text-destructive rounded text-xs">
                {conflictSummary.critical} conflict{conflictSummary.critical > 1 ? 's' : ''}
              </span>
            )}
            {optimizations.length > 0 && (
              <span className="px-1.5 py-0.5 bg-primary/20 text-primary rounded text-xs">
                {optimizations.length} tip{optimizations.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <span className="text-muted-foreground text-sm">
          {isCollapsed ? '▼' : '▲'}
        </span>
      </button>
      
      {/* Content */}
      {!isCollapsed && (
        <div className="border-t border-border">
          {/* Tabs */}
          <div className="flex border-b border-border">
            {[
              { id: 'score', label: 'Score', count: null },
              { id: 'optimize', label: 'Optimize', count: optimizations.filter(o => o.priority !== 'low').length },
              { id: 'conflicts', label: 'Conflicts', count: conflictSummary.critical + conflictSummary.warnings },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-secondary text-foreground border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
                {tab.count !== null && tab.count > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                    tab.id === 'conflicts' ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          {/* Tab Content */}
          <div className="p-4">
            {/* Score Tab */}
            {activeTab === 'score' && (
              <div className="space-y-4">
                {/* Overall score */}
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(score.overall)}`}>
                    {score.overall}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Schedule Quality</p>
                </div>
                
                {/* Score breakdown */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Focus Time', value: score.focusTime, icon: '🎯' },
                    { label: 'Balance', value: score.balance, icon: '⚖️' },
                    { label: 'Flow', value: score.transitions, icon: '🌊' },
                    { label: 'Alignment', value: score.identityAlignment, icon: '🧭' },
                  ].map(item => (
                    <div key={item.label} className="bg-secondary/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{item.icon}</span>
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.value >= 80 ? 'bg-primary' :
                              item.value >= 60 ? 'bg-yellow-500' : 'bg-destructive'
                            }`}
                            style={{ width: `${item.value}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${getScoreColor(item.value)}`}>
                          {item.value}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Optimize Tab */}
            {activeTab === 'optimize' && (
              <div className="space-y-3">
                {optimizations.length === 0 ? (
                  <div className="text-center py-4">
                    <span className="text-2xl">✨</span>
                    <p className="text-sm text-muted-foreground mt-2">
                      Your schedule looks optimized!
                    </p>
                  </div>
                ) : (
                  optimizations.map(opt => (
                    <div
                      key={opt.id}
                      className={`rounded-lg p-3 border ${
                        opt.priority === 'high' 
                          ? 'bg-primary/5 border-primary/20' 
                          : opt.priority === 'medium'
                            ? 'bg-yellow-500/5 border-yellow-500/20'
                            : 'bg-secondary/50 border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              opt.priority === 'high' ? 'bg-primary/20 text-primary' :
                              opt.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-500' :
                              'bg-secondary text-muted-foreground'
                            }`}>
                              {opt.priority}
                            </span>
                            <span className="font-medium text-sm text-foreground">
                              {opt.title}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {opt.description}
                          </p>
                        </div>
                        {opt.proposedChange && (
                          <button
                            onClick={() => handleApplyOptimization(opt)}
                            className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 shrink-0"
                          >
                            Apply
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            
            {/* Conflicts Tab */}
            {activeTab === 'conflicts' && (
              <div className="space-y-3">
                {conflicts.length === 0 ? (
                  <div className="text-center py-4">
                    <span className="text-2xl">✅</span>
                    <p className="text-sm text-muted-foreground mt-2">
                      No conflicts detected
                    </p>
                  </div>
                ) : (
                  conflicts.map(conflict => (
                    <div
                      key={conflict.id}
                      className={`rounded-lg p-3 border ${
                        conflict.severity === 'critical' 
                          ? 'bg-destructive/5 border-destructive/20' 
                          : conflict.severity === 'warning'
                            ? 'bg-yellow-500/5 border-yellow-500/20'
                            : 'bg-secondary/50 border-border'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`text-sm ${
                          conflict.severity === 'critical' ? 'text-destructive' :
                          conflict.severity === 'warning' ? 'text-yellow-500' :
                          'text-muted-foreground'
                        }`}>
                          {conflict.severity === 'critical' ? '⚠️' :
                           conflict.severity === 'warning' ? '⚡' : 'ℹ️'}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm text-foreground font-medium">
                            {conflict.description}
                          </p>
                          
                          {/* Resolutions */}
                          <div className="mt-2 space-y-1">
                            {conflict.suggestedResolutions.slice(0, 2).map(resolution => (
                              <button
                                key={resolution.id}
                                onClick={() => handleApplyResolution(resolution)}
                                className="w-full text-left px-2 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded transition-colors"
                              >
                                {resolution.description}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}




