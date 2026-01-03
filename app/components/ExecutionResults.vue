<template>
  <div class="execution-results">
    <!-- Node Detail Modal -->
    <UModal 
      v-model:open="showNodeDetail"
      :title="selectedNode ? getNodeDescription(selectedNode.nodeId) : ''"
      :description="selectedNode?.nodeId"
      :ui="{ content: 'max-w-4xl' }"
    >
      <template #header v-if="selectedNode">
        <div class="flex items-center justify-between w-full">
          <div class="flex-1">
            <h3 class="text-lg font-semibold">{{ getNodeDescription(selectedNode.nodeId) }}</h3>
            <p class="text-xs text-gray-500 mt-1">{{ selectedNode.nodeId }}</p>
          </div>
          <UBadge 
            :color="selectedNode.status === 'completed' ? 'success' : selectedNode.status === 'cached' ? 'info' : selectedNode.status === 'failed' ? 'error' : 'warning'"
            class="ml-4"
          >
            {{ selectedNode.status }}
          </UBadge>
        </div>
      </template>

      <template #body v-if="selectedNode">
        <!-- Tabs for different sections -->
        <UTabs :items="nodeDetailTabs" class="w-full">
          <template #output="{ item }">
            <div class="space-y-4 py-4">
              <div v-if="getNodeArtifact(selectedNode.nodeId)">
                <div class="flex items-center justify-between mb-2">
                  <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Output Content</h4>
                  <div class="flex gap-1">
                    <UButton
                      icon="i-heroicons-clipboard"
                      variant="ghost"
                      size="xs"
                      @click="copyNodeOutput(selectedNode.nodeId)"
                    >
                      Copy
                    </UButton>
                    <UBadge variant="soft" color="primary">
                      {{ getNodeArtifact(selectedNode.nodeId)?.type || 'text' }}
                    </UBadge>
                  </div>
                </div>
                
                <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <template v-if="getNodeArtifact(selectedNode.nodeId)?.type === 'json'">
                    <pre class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ JSON.stringify(getNodeArtifact(selectedNode.nodeId)?.content, null, 2) }}</pre>
                  </template>
                  <template v-else>
                    <div class="prose prose-sm dark:prose-invert max-w-none">
                      <MDC :value="getNodeArtifact(selectedNode.nodeId)?.content || 'No output available'" />
                    </div>
                  </template>
                </div>
              </div>
              <div v-else class="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p class="text-yellow-700 dark:text-yellow-300">No output available for this node</p>
              </div>
            </div>
          </template>

          <template #metrics="{ item }">
            <div class="space-y-4 py-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Execution Time</p>
                  <p class="text-lg font-semibold">{{ formatTime(selectedNode.duration) }}</p>
                </div>
                
                <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Cost</p>
                  <p class="text-lg font-semibold">${{ selectedNode.cost?.toFixed(4) || '0.0000' }}</p>
                </div>
                
                <div v-if="selectedNode.tokensUsed" class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Tokens</p>
                  <p class="text-lg font-semibold">{{ formatNumber(selectedNode.tokensUsed.total) }}</p>
                </div>
                
                <div v-if="selectedNode.parallelBatch !== undefined" class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Batch</p>
                  <p class="text-lg font-semibold">#{{ selectedNode.parallelBatch + 1 }}</p>
                </div>
              </div>

              <div v-if="selectedNode.tokensUsed" class="mt-4">
                <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Token Breakdown</h4>
                <div class="space-y-2">
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-500">Prompt Tokens:</span>
                    <span class="font-medium">{{ formatNumber(selectedNode.tokensUsed.prompt) }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-500">Completion Tokens:</span>
                    <span class="font-medium">{{ formatNumber(selectedNode.tokensUsed.completion) }}</span>
                  </div>
                </div>
              </div>

              <div v-if="getNodeArtifact(selectedNode.nodeId)" class="mt-4">
                <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Metadata</h4>
                <div class="space-y-2">
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-500">Model:</span>
                    <span class="font-medium">{{ getNodeArtifact(selectedNode.nodeId)?.metadata?.model || 'N/A' }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-500">Timestamp:</span>
                    <span class="font-medium">{{ new Date(getNodeArtifact(selectedNode.nodeId)?.metadata?.timestamp || 0).toLocaleString() }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <template #details="{ item }">
            <div class="space-y-4 py-4">
              <div v-if="getNodeFromPlan(selectedNode.nodeId)">
                <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Node Configuration</h4>
                
                <div class="space-y-3">
                  <div v-if="getNodeFromPlan(selectedNode.nodeId)?.model" class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Model</p>
                    <p class="text-sm font-medium">{{ getNodeFromPlan(selectedNode.nodeId).model }}</p>
                  </div>

                  <div v-if="getNodeFromPlan(selectedNode.nodeId)?.temperature !== undefined" class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Temperature</p>
                    <p class="text-sm font-medium">{{ getNodeFromPlan(selectedNode.nodeId).temperature }}</p>
                  </div>

                  <div v-if="getNodeFromPlan(selectedNode.nodeId)?.promptTemplate" class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Prompt Template</p>
                    <pre class="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap mt-2">{{ getNodeFromPlan(selectedNode.nodeId).promptTemplate }}</pre>
                  </div>

                  <div v-if="getNodeFromPlan(selectedNode.nodeId)?.systemPrompt" class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">System Prompt</p>
                    <pre class="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap mt-2">{{ getNodeFromPlan(selectedNode.nodeId).systemPrompt }}</pre>
                  </div>

                  <div v-if="selectedNode.dependencies.length > 0" class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Dependencies</p>
                    <div class="flex flex-wrap gap-2">
                      <UBadge
                        v-for="dep in selectedNode.dependencies"
                        :key="dep"
                        variant="soft"
                        color="primary"
                        size="xs"
                      >
                        {{ getNodeDescription(dep) }}
                      </UBadge>
                    </div>
                  </div>

                  <div v-if="getNodeFromPlan(selectedNode.nodeId)?.outputType" class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Output Type</p>
                    <p class="text-sm font-medium">{{ getNodeFromPlan(selectedNode.nodeId).outputType }}</p>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </UTabs>
      </template>
    </UModal>

    <!-- Performance Overview -->
    <div class="mb-6">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">Execution Performance</h3>
            <UBadge :color="(result.totalCost || 0) < 0.01 ? 'success' : (result.totalCost || 0) < 0.1 ? 'warning' : 'error'">
              <UIcon name="i-heroicons-currency-dollar" class="w-3 h-3 mr-1" />
              ${{ result.totalCost?.toFixed(4) || '0.0000' }}
            </UBadge>
          </div>
        </template>
        
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Total Time -->
          <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <UIcon name="i-heroicons-clock" class="w-5 h-5 text-primary" />
              <span class="text-xs text-gray-600 dark:text-gray-400">Total Time</span>
            </div>
            <p class="text-xl font-bold">{{ formatTime(result.executionTime) }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ result.metrics?.length || 0 }} nodes executed</p>
          </div>
          
          <!-- Parallel Batches -->
          <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <UIcon name="i-heroicons-arrows-right-left" class="w-5 h-5 text-primary" />
              <span class="text-xs text-gray-600 dark:text-gray-400">Parallel Batches</span>
            </div>
            <p class="text-xl font-bold">{{ result.parallelBatches || 1 }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ getMaxParallelNodes() }} max parallel</p>
          </div>
          
          <!-- Cache Performance -->
          <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <UIcon name="i-heroicons-cpu-chip" class="w-5 h-5 text-primary" />
              <span class="text-xs text-gray-600 dark:text-gray-400">Cache Hit Rate</span>
            </div>
            <p class="text-xl font-bold">{{ getCacheHitRate() }}%</p>
            <p class="text-xs text-gray-500 mt-1">
              {{ result.cachingStats?.hits || 0 }} hits, {{ result.cachingStats?.misses || 0 }} misses
            </p>
          </div>
          
          <!-- Token Usage -->
          <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <UIcon name="i-heroicons-document-text" class="w-5 h-5 text-primary" />
              <span class="text-xs text-gray-600 dark:text-gray-400">Total Tokens</span>
            </div>
            <p class="text-xl font-bold">{{ formatNumber(getTotalTokens()) }}</p>
            <p class="text-xs text-gray-500 mt-1">
              {{ formatNumber(getTotalPromptTokens()) }} prompt / {{ formatNumber(getTotalCompletionTokens()) }} completion
            </p>
          </div>
        </div>
      </UCard>
    </div>
    
    <!-- Execution Timeline -->
    <div class="mb-6">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">Execution Timeline</h3>
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <div class="flex items-center gap-1">
                <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Completed</span>
              </div>
              <div class="flex items-center gap-1">
                <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Cached</span>
              </div>
              <div class="flex items-center gap-1">
                <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Failed</span>
              </div>
            </div>
          </div>
        </template>
        
        <div class="space-y-3">
          <!-- Timeline by batch -->
          <div v-for="(batch, batchIndex) in getNodesByBatch()" :key="batchIndex" class="border-l-2 border-gray-200 dark:border-gray-700 pl-4">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-8 h-8 -ml-8 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                {{ batchIndex + 1 }}
              </div>
              <span class="text-sm font-medium">Batch {{ batchIndex + 1 }}</span>
              <span class="text-xs text-gray-500">({{ batch.length }} nodes in parallel)</span>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              <div
                v-for="metric in batch"
                :key="metric.nodeId"
                class="p-3 rounded-lg border transition-all hover:shadow-md cursor-pointer"
                :class="getNodeStatusClass(metric.status)"
                @click="openNodeDetail(metric)"
              >
                <div class="flex items-start justify-between mb-2">
                  <div class="flex-1 min-w-0 mr-2">
                    <div class="flex items-center gap-1">
                      <p class="text-sm font-medium break-words">{{ getNodeDescription(metric.nodeId) }}</p>
                      <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3 h-3 text-gray-400" />
                    </div>
                    <p class="text-xs text-gray-500 break-all">{{ metric.nodeId }}</p>
                  </div>
                  <UBadge 
                    :color="metric.status === 'completed' ? 'success' : metric.status === 'cached' ? 'info' : metric.status === 'failed' ? 'error' : 'warning'"
                    size="xs"
                    class="shrink-0"
                  >
                    {{ metric.status }}
                  </UBadge>
                </div>
                
                <div class="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span class="text-gray-500">Duration:</span>
                    <span class="font-medium ml-1">{{ formatTime(metric.duration) }}</span>
                  </div>
                  <div v-if="metric.tokensUsed">
                    <span class="text-gray-500">Tokens:</span>
                    <span class="font-medium ml-1">{{ formatNumber(metric.tokensUsed.total) }}</span>
                  </div>
                  <div v-if="metric.cost">
                    <span class="text-gray-500">Cost:</span>
                    <span class="font-medium ml-1">${{ metric.cost.toFixed(4) }}</span>
                  </div>
                  <div v-if="metric.dependencies.length > 0">
                    <span class="text-gray-500">Deps:</span>
                    <span class="font-medium ml-1">{{ metric.dependencies.length }}</span>
                  </div>
                </div>
                
                <!-- Progress bar showing relative duration -->
                <div class="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    class="h-full transition-all"
                    :class="metric.status === 'completed' ? 'bg-green-500' : metric.status === 'cached' ? 'bg-blue-500' : 'bg-red-500'"
                    :style="{ width: `${getDurationPercentage(metric.duration)}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </div>
    
    <!-- Critical Path -->
    <div class="mb-6" v-if="result.criticalPath && result.criticalPath.length > 0">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-fire" class="w-5 h-5 text-orange-500" />
            <h3 class="text-lg font-semibold">Critical Path</h3>
            <p class="text-xs text-gray-500">The longest dependency chain determining minimum execution time</p>
          </div>
        </template>
        
        <div class="flex items-center flex-wrap gap-2">
          <div
            v-for="(nodeId, index) in (result.criticalPath || [])"
            :key="nodeId"
            class="flex items-center"
          >
            <div class="px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg text-sm font-medium">
              {{ getNodeDescription(nodeId) || nodeId }}
            </div>
            <UIcon 
              v-if="result.criticalPath && index < result.criticalPath.length - 1"
              name="i-heroicons-arrow-right"
              class="w-4 h-4 mx-2 text-gray-400"
            />
          </div>
        </div>
      </UCard>
    </div>
    
    <!-- Final Output -->
    <div>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-document-check" class="w-5 h-5 text-primary" />
              <h3 class="text-lg font-semibold">Final Output</h3>
            </div>
            <div class="flex items-center gap-2">
              <UButton
                icon="i-heroicons-clipboard"
                variant="soft"
                size="xs"
                @click="copyOutput"
              >
                Copy
              </UButton>
              <UButton
                icon="i-heroicons-arrow-down-tray"
                variant="soft"
                size="xs"
                @click="downloadOutput"
              >
                Download
              </UButton>
            </div>
          </div>
        </template>
        
        <div class="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-li:text-gray-700 dark:prose-li:text-gray-300 prose-code:text-primary-600 dark:prose-code:text-primary-400 prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-50 dark:prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700">
          <template v-if="result.finalOutput?.type === 'json'">
            <pre class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm">{{ JSON.stringify(result.finalOutput.content, null, 2) }}</pre>
          </template>
          <template v-else-if="result.finalOutput?.content">
            <MDC :value="result.finalOutput.content" />
          </template>
          <template v-else>
            <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p class="text-yellow-700 dark:text-yellow-300">No output content available</p>
            </div>
          </template>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
// Define types locally to avoid import issues
interface ExecutionMetrics {
  nodeId: string
  startTime: number
  endTime: number
  duration: number
  tokensUsed?: {
    prompt: number
    completion: number
    total: number
  }
  cost?: number
  parallelBatch?: number
  dependencies: string[]
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cached'
}

interface EnhancedExecutionResult {
  plan: any
  artifacts: Record<string, any>
  finalOutput: any
  executionTime: number
  totalCost?: number
  metrics?: ExecutionMetrics[]
  parallelBatches?: number
  totalDuration?: number
  criticalPath?: string[]
  cachingStats?: {
    hits: number
    misses: number
    hitRate: number
  }
  executionGraph?: {
    nodes: Array<{
      id: string
      level: number
      batch: number
      duration: number
      status: string
    }>
    edges: Array<{
      source: string
      target: string
    }>
  }
}

const props = defineProps<{
  result: EnhancedExecutionResult
  plan: any
}>()

const toast = useToast()

// Modal state
const showNodeDetail = ref(false)
const selectedNode = ref<ExecutionMetrics | null>(null)

// Tab items for the modal
const nodeDetailTabs = [
  {
    slot: 'output',
    label: 'Output',
    icon: 'i-heroicons-document-text'
  },
  {
    slot: 'metrics',
    label: 'Metrics',
    icon: 'i-heroicons-chart-bar'
  },
  {
    slot: 'details',
    label: 'Configuration',
    icon: 'i-heroicons-cog-6-tooth'
  }
]

// Helper functions
const formatTime = (ms: number): string => {
  if (!ms) return '0ms'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}min`
}

const formatNumber = (num: number): string => {
  if (!num) return '0'
  if (num < 1000) return num.toString()
  if (num < 1000000) return `${(num / 1000).toFixed(1)}k`
  return `${(num / 1000000).toFixed(1)}M`
}

const getNodesByBatch = (): ExecutionMetrics[][] => {
  if (!props.result.metrics) return []
  
  const batches: ExecutionMetrics[][] = []
  props.result.metrics.forEach(metric => {
    const batchIndex = metric.parallelBatch || 0
    if (!batches[batchIndex]) {
      batches[batchIndex] = []
    }
    batches[batchIndex].push(metric)
  })
  
  return batches
}

const getMaxParallelNodes = (): number => {
  const batches = getNodesByBatch()
  return Math.max(...batches.map(batch => batch.length), 1)
}

const getCacheHitRate = (): string => {
  const stats = props.result.cachingStats
  if (!stats) return '0'
  return ((stats.hitRate || 0) * 100).toFixed(1)
}

const getTotalTokens = (): number => {
  if (!props.result.metrics) return 0
  return props.result.metrics.reduce((sum, m) => sum + (m.tokensUsed?.total || 0), 0)
}

const getTotalPromptTokens = (): number => {
  if (!props.result.metrics) return 0
  return props.result.metrics.reduce((sum, m) => sum + (m.tokensUsed?.prompt || 0), 0)
}

const getTotalCompletionTokens = (): number => {
  if (!props.result.metrics) return 0
  return props.result.metrics.reduce((sum, m) => sum + (m.tokensUsed?.completion || 0), 0)
}

const getNodeDescription = (nodeId: string): string => {
  const node = props.plan?.nodes.find((n: any) => n.id === nodeId)
  return node?.description || nodeId
}

const getNodeStatusClass = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
    case 'cached':
      return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
    case 'failed':
      return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
    default:
      return 'border-gray-200 dark:border-gray-700'
  }
}

const getDurationPercentage = (duration: number): number => {
  if (!props.result.metrics || !duration) return 0
  const maxDuration = Math.max(...props.result.metrics.map(m => m.duration || 0))
  return maxDuration > 0 ? (duration / maxDuration) * 100 : 0
}

// Modal methods
const openNodeDetail = (metric: ExecutionMetrics) => {
  selectedNode.value = metric
  showNodeDetail.value = true
}

const getNodeArtifact = (nodeId: string) => {
  return props.result.artifacts?.[nodeId]
}

const getNodeFromPlan = (nodeId: string) => {
  return props.plan?.nodes?.find((n: any) => n.id === nodeId)
}

const copyNodeOutput = async (nodeId: string) => {
  const artifact = getNodeArtifact(nodeId)
  if (!artifact) {
    toast.add({
      title: 'Error',
      description: 'No output available to copy',
      color: 'error'
    })
    return
  }

  const content = typeof artifact.content === 'string'
    ? artifact.content
    : JSON.stringify(artifact.content, null, 2)
  
  await navigator.clipboard.writeText(content)
  
  toast.add({
    title: 'Copied',
    description: 'Node output copied to clipboard',
    color: 'primary'
  })
}

const copyOutput = async () => {
  const content = typeof props.result.finalOutput?.content === 'string'
    ? props.result.finalOutput.content
    : JSON.stringify(props.result.finalOutput?.content, null, 2)
  
  await navigator.clipboard.writeText(content)
  
  toast.add({
    title: 'Copied',
    description: 'Output copied to clipboard',
    color: 'primary'
  })
}

const downloadOutput = () => {
  const content = typeof props.result.finalOutput?.content === 'string'
    ? props.result.finalOutput.content
    : JSON.stringify(props.result.finalOutput?.content, null, 2)
  
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ragdag-output-${Date.now()}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  
  toast.add({
    title: 'Downloaded',
    description: 'Output saved to file',
    color: 'primary'
  })
}
</script>

