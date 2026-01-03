<template>
  <div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
    <!-- Header -->
    <header class="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-14">
          <div class="flex items-center gap-3">
            <h1 class="text-lg font-semibold text-gray-900 dark:text-white">DocPipe</h1>
            <span class="text-sm text-gray-500">SQL for Documents</span>
          </div>
          <div class="flex items-center gap-2">
            <UBadge
              :color="apiStatus === 'active' ? 'success' : 'warning'"
              variant="subtle"
              size="xs"
            >
              {{ apiStatus === 'active' ? 'AI Mode' : 'Simulation' }}
            </UBadge>
            <UButton
              v-if="result"
              icon="i-heroicons-arrow-path"
              variant="ghost"
              size="xs"
              @click="reset"
            >
              Reset
            </UButton>
          </div>
        </div>
      </div>
    </header>

    <main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
      <!-- Query Input Section -->
      <div class="mb-6">
        <UCard>
          <div class="flex gap-4">
            <div class="flex-1">
              <UTextarea
                v-model="query"
                placeholder="Ask a question about your documents... e.g., 'What are the top topics for angry texts, percentage wise?'"
                :rows="2"
                :disabled="loading"
                class="w-full"
                @keydown.meta.enter="runQuery"
                @keydown.ctrl.enter="runQuery"
              />
            </div>
            <div class="flex flex-col gap-2">
              <UButton
                @click="runQuery"
                :loading="loading"
                :disabled="!query || documents.length === 0"
                icon="i-heroicons-play"
                size="lg"
              >
                Run
              </UButton>
              <UButton
                @click="showExamples = true"
                variant="ghost"
                size="sm"
              >
                Examples
              </UButton>
            </div>
          </div>
        </UCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Documents Panel -->
        <div class="lg:col-span-1">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h2 class="font-semibold text-gray-900 dark:text-white">Documents</h2>
                <UBadge variant="soft" size="xs">{{ documents.length }} loaded</UBadge>
              </div>
            </template>

            <div class="space-y-3">
              <!-- Quick filters -->
              <div class="flex flex-wrap gap-1">
                <UButton
                  v-for="type in documentTypes"
                  :key="type"
                  size="xs"
                  :variant="selectedTypes.includes(type) ? 'solid' : 'ghost'"
                  @click="toggleType(type)"
                >
                  {{ type }}
                </UButton>
              </div>

              <!-- Document list -->
              <div class="max-h-[400px] overflow-y-auto space-y-2">
                <div
                  v-for="doc in filteredDocuments"
                  :key="doc.id"
                  class="p-2 rounded-md border border-gray-200 dark:border-gray-700 text-xs"
                >
                  <div class="flex items-center gap-2 mb-1">
                    <UBadge :color="getTypeColor(doc.metadata.type)" size="xs">
                      {{ doc.metadata.type }}
                    </UBadge>
                    <span class="text-gray-500 truncate">{{ doc.metadata.author }}</span>
                  </div>
                  <p class="text-gray-700 dark:text-gray-300 line-clamp-2">
                    {{ doc.content.substring(0, 150) }}...
                  </p>
                </div>
              </div>

              <div class="text-xs text-gray-500 text-center">
                {{ filteredDocuments.length }} of {{ documents.length }} documents
              </div>
            </div>
          </UCard>
        </div>

        <!-- Pipeline & Results Panel -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Pipeline Visualization -->
          <UCard v-if="pipeline">
            <template #header>
              <div class="flex items-center justify-between">
                <h2 class="font-semibold text-gray-900 dark:text-white">Pipeline</h2>
                <UButton
                  icon="i-heroicons-code-bracket"
                  variant="ghost"
                  size="xs"
                  @click="showPipelineJson = !showPipelineJson"
                >
                  {{ showPipelineJson ? 'Visual' : 'JSON' }}
                </UButton>
              </div>
            </template>

            <div v-if="showPipelineJson">
              <pre class="text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded-lg overflow-auto max-h-[300px]">{{ JSON.stringify(pipeline, null, 2) }}</pre>
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="(op, index) in pipeline.operations"
                :key="op.id"
                class="flex items-center gap-3"
              >
                <!-- Step indicator -->
                <div class="flex flex-col items-center">
                  <div
                    class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all"
                    :class="getOperationStatusClass(op)"
                  >
                    <UIcon v-if="op.status === 'complete'" name="i-heroicons-check" class="w-4 h-4" />
                    <UIcon v-else-if="op.status === 'running'" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                    <span v-else>{{ index + 1 }}</span>
                  </div>
                  <div v-if="index < pipeline.operations.length - 1" class="w-0.5 h-4 bg-gray-300 dark:bg-gray-700"></div>
                </div>

                <!-- Operation details -->
                <div class="flex-1 p-3 rounded-lg border" :class="getOperationBorderClass(op)">
                  <div class="flex items-center gap-2 mb-1">
                    <UBadge :color="getOperationColor(op.type)" size="xs">
                      {{ op.type }}
                    </UBadge>
                    <span class="text-sm font-medium text-gray-900 dark:text-white">{{ op.description }}</span>
                  </div>
                  <div v-if="op.stats" class="text-xs text-gray-500 flex gap-3">
                    <span>{{ op.stats.inputCount }} in</span>
                    <span>{{ op.stats.outputCount }} out</span>
                    <span>{{ op.stats.duration }}ms</span>
                  </div>
                </div>
              </div>
            </div>
          </UCard>

          <!-- Results -->
          <UCard v-if="result">
            <template #header>
              <div class="flex items-center justify-between">
                <h2 class="font-semibold text-gray-900 dark:text-white">Results</h2>
                <div class="flex items-center gap-2">
                  <UBadge variant="soft" size="xs">
                    {{ result.stats.totalDuration }}ms
                  </UBadge>
                  <UBadge variant="soft" size="xs" color="success">
                    ${{ result.stats.totalCost.toFixed(4) }}
                  </UBadge>
                </div>
              </div>
            </template>

            <!-- Render based on output type -->
            <div>
              <!-- Aggregate results (distribution/percentage) -->
              <div v-if="result.output.type === 'aggregate' && typeof result.output.value === 'object'">
                <div class="space-y-2">
                  <div
                    v-for="(value, key) in result.output.value"
                    :key="key"
                    class="flex items-center gap-3"
                  >
                    <div class="w-32 text-sm font-medium text-gray-900 dark:text-white truncate">
                      {{ key }}
                    </div>
                    <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                      <div
                        class="bg-primary h-full rounded-full transition-all"
                        :style="{ width: `${Math.min(value, 100)}%` }"
                      ></div>
                    </div>
                    <div class="w-16 text-sm text-right text-gray-600 dark:text-gray-400">
                      {{ value }}{{ result.output.asPercentage ? '%' : '' }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Single aggregate value -->
              <div v-else-if="result.output.type === 'aggregate' && typeof result.output.value === 'number'">
                <div class="text-center py-8">
                  <div class="text-5xl font-bold text-primary">{{ result.output.value }}</div>
                  <div class="text-sm text-gray-500 mt-2">Total count</div>
                </div>
              </div>

              <!-- Computed value -->
              <div v-else-if="result.output.type === 'computed'">
                <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div class="text-lg text-gray-900 dark:text-white mb-2">
                    {{ result.output.value }}
                  </div>
                  <div v-if="result.output.explanation" class="text-sm text-gray-500">
                    {{ result.output.explanation }}
                  </div>
                </div>
              </div>

              <!-- Dataset result -->
              <div v-else-if="result.output.documents">
                <div class="text-sm text-gray-500 mb-3">
                  {{ result.output.documents.length }} documents
                </div>
                <div class="space-y-2 max-h-[300px] overflow-y-auto">
                  <div
                    v-for="doc in result.output.documents.slice(0, 20)"
                    :key="doc.id"
                    class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm"
                  >
                    <div class="flex flex-wrap gap-2 mb-2">
                      <UBadge
                        v-for="(value, key) in doc.metadata"
                        :key="key"
                        variant="outline"
                        size="xs"
                      >
                        {{ key }}: {{ typeof value === 'object' ? JSON.stringify(value) : value }}
                      </UBadge>
                    </div>
                    <p class="text-gray-700 dark:text-gray-300 line-clamp-2">{{ doc.content }}</p>
                  </div>
                </div>
              </div>

              <!-- Grouped result -->
              <div v-else-if="result.output.groups">
                <div class="space-y-4">
                  <div
                    v-for="(docs, groupKey) in result.output.groups"
                    :key="groupKey"
                    class="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <span class="font-medium text-gray-900 dark:text-white">{{ groupKey }}</span>
                      <UBadge variant="soft" size="xs">{{ docs.length }}</UBadge>
                    </div>
                    <div class="text-xs text-gray-500">
                      {{ docs.slice(0, 3).map((d: any) => d.content.substring(0, 50) + '...').join(' | ') }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Fallback JSON -->
              <div v-else>
                <pre class="text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded-lg overflow-auto">{{ JSON.stringify(result.output, null, 2) }}</pre>
              </div>
            </div>
          </UCard>

          <!-- Empty state -->
          <div v-if="!pipeline && !loading" class="text-center py-12">
            <UIcon name="i-heroicons-document-magnifying-glass" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Query Your Documents</h3>
            <p class="text-gray-500 max-w-md mx-auto">
              Enter a question above to analyze your document collection. DocPipe will create an AI-powered pipeline to filter, classify, extract, and aggregate your data.
            </p>
          </div>
        </div>
      </div>
    </main>

    <!-- Examples Modal -->
    <UModal v-model:open="showExamples">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">Example Queries</h3>
          <div class="space-y-3">
            <div
              v-for="example in exampleQueries"
              :key="example.query"
              class="p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              @click="useExample(example)"
            >
              <p class="font-medium text-gray-900 dark:text-white mb-1">{{ example.query }}</p>
              <p class="text-sm text-gray-500">{{ example.description }}</p>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// Types
interface Document {
  id: string
  content: string
  metadata: Record<string, any>
}

interface PipelineOperation {
  id: string
  type: string
  description: string
  config: any
  status?: string
  stats?: {
    inputCount: number
    outputCount: number
    duration: number
    tokensUsed: number
    cost: number
  }
}

interface Pipeline {
  id: string
  query: string
  operations: PipelineOperation[]
  outputType: string
}

interface PipelineResult {
  pipeline: Pipeline
  output: any
  stats: {
    totalDuration: number
    totalTokens: number
    totalCost: number
    documentsProcessed: number
  }
}

// State
const query = ref('')
const documents = ref<Document[]>([])
const pipeline = ref<Pipeline | null>(null)
const result = ref<PipelineResult | null>(null)
const loading = ref(false)
const apiStatus = ref<'active' | 'simulation'>('simulation')
const showExamples = ref(false)
const showPipelineJson = ref(false)
const selectedTypes = ref<string[]>([])

const toast = useToast()

// Example queries
const exampleQueries = [
  {
    query: 'What are the top topics for angry texts, percentage wise?',
    description: 'Classify sentiment, filter angry, extract topics, compute distribution'
  },
  {
    query: 'How many documents mention the government?',
    description: 'Filter documents containing "government", count results'
  },
  {
    query: 'Summarize the key events in chronological order',
    description: 'Extract dates and events, sort by time, summarize'
  },
  {
    query: 'What is the overall sentiment trend across all documents?',
    description: 'Classify sentiment for all documents, aggregate distribution'
  },
  {
    query: 'Find documents about scientific discoveries and extract key findings',
    description: 'Filter scientific content, extract findings and conclusions'
  }
]

// Computed
const documentTypes = computed(() => {
  const types = new Set(documents.value.map(d => d.metadata.type))
  return Array.from(types)
})

const filteredDocuments = computed(() => {
  if (selectedTypes.value.length === 0) return documents.value
  return documents.value.filter(d => selectedTypes.value.includes(d.metadata.type))
})

// Methods
const loadDocuments = async () => {
  try {
    const response = await $fetch('/api/docpipe/documents')
    documents.value = response.documents
  } catch (error) {
    console.error('Failed to load documents:', error)
    toast.add({
      title: 'Failed to load documents',
      color: 'error'
    })
  }
}

const checkApiStatus = async () => {
  try {
    const response = await $fetch('/api/ragdag/check-api-status')
    apiStatus.value = response.hasApiKey ? 'active' : 'simulation'
  } catch {
    apiStatus.value = 'simulation'
  }
}

const runQuery = async () => {
  if (!query.value || documents.value.length === 0) return

  loading.value = true
  pipeline.value = null
  result.value = null

  try {
    // Step 1: Generate pipeline
    const planResponse = await $fetch('/api/docpipe/plan', {
      method: 'POST',
      body: {
        query: query.value,
        sampleDocuments: filteredDocuments.value.slice(0, 3)
      }
    })

    if (!planResponse.pipeline) {
      throw new Error('Failed to generate pipeline')
    }

    pipeline.value = planResponse.pipeline

    // Mark all operations as pending
    pipeline.value.operations.forEach(op => {
      op.status = 'pending'
    })

    toast.add({
      title: 'Pipeline Generated',
      description: `${pipeline.value.operations.length} operations planned`,
      color: 'primary'
    })

    // Step 2: Execute pipeline
    // Mark first operation as running
    if (pipeline.value.operations.length > 0) {
      pipeline.value.operations[0].status = 'running'
    }

    const execResponse = await $fetch('/api/docpipe/execute', {
      method: 'POST',
      body: {
        pipeline: pipeline.value,
        documents: filteredDocuments.value
      }
    })

    if (!execResponse.result) {
      throw new Error('Failed to execute pipeline')
    }

    result.value = execResponse.result

    // Update pipeline with execution results
    pipeline.value = result.value.pipeline

    toast.add({
      title: 'Query Complete',
      description: `Processed ${result.value.stats.documentsProcessed} documents in ${result.value.stats.totalDuration}ms`,
      color: 'success'
    })
  } catch (error: any) {
    console.error('Query failed:', error)
    toast.add({
      title: 'Query Failed',
      description: error.message || 'An error occurred',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

const reset = () => {
  query.value = ''
  pipeline.value = null
  result.value = null
}

const toggleType = (type: string) => {
  const index = selectedTypes.value.indexOf(type)
  if (index > -1) {
    selectedTypes.value.splice(index, 1)
  } else {
    selectedTypes.value.push(type)
  }
}

const useExample = (example: { query: string }) => {
  query.value = example.query
  showExamples.value = false
}

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    report: 'primary',
    email: 'success',
    news: 'info',
    social: 'warning',
    memo: 'secondary',
    transcript: 'neutral'
  }
  return colors[type] || 'neutral'
}

const getOperationColor = (type: string) => {
  const colors: Record<string, string> = {
    filter: 'error',
    classify: 'primary',
    extract: 'success',
    transform: 'warning',
    group: 'info',
    aggregate: 'secondary',
    sort: 'neutral',
    limit: 'neutral',
    compute: 'primary'
  }
  return colors[type] || 'neutral'
}

const getOperationStatusClass = (op: PipelineOperation) => {
  if (op.status === 'complete') return 'bg-success text-white'
  if (op.status === 'running') return 'bg-primary text-white'
  if (op.status === 'error') return 'bg-error text-white'
  return 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
}

const getOperationBorderClass = (op: PipelineOperation) => {
  if (op.status === 'complete') return 'border-success-200 dark:border-success-800 bg-success-50 dark:bg-success-900/20'
  if (op.status === 'running') return 'border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20'
  if (op.status === 'error') return 'border-error-200 dark:border-error-800 bg-error-50 dark:bg-error-900/20'
  return 'border-gray-200 dark:border-gray-700'
}

// Lifecycle
onMounted(() => {
  loadDocuments()
  checkApiStatus()
})
</script>
