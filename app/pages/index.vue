<template>
  <div class="min-h-screen flex flex-col">
    <!-- Compact Header -->
    <div class="sticky top-0 z-30 backdrop-blur border-b border-gray-200 dark:border-gray-800">
      <div class="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-12">
          <div class="flex items-center gap-3">
            <h1 class="text-base font-semibold">DAG Executor</h1>
            <UBadge 
              :color="apiKeyStatus === 'active' ? 'success' : 'warning'" 
              variant="subtle"
              size="xs"
            >
              <UIcon :name="apiKeyStatus === 'active' ? 'i-heroicons-sparkles' : 'i-heroicons-beaker'" class="w-3 h-3 mr-1" />
              {{ apiKeyStatus === 'active' ? 'AI Mode' : 'Simulation Mode' }}
            </UBadge>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              icon="i-heroicons-arrow-path"
              variant="ghost"
              size="xs"
              @click="reset"
              :disabled="!canReset"
            >
              Reset
            </UButton>
            <UButton
              icon="i-heroicons-bug-ant"
              variant="ghost"
              size="xs"
              @click="showDebug = true"
              :disabled="!result"
            >
              Debug
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
      <!-- Workflow Progress Indicator -->
      <div class="mb-6">
        <div class="flex items-center justify-center gap-2">
          <div class="flex items-center gap-1">
            <div 
              class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors"
              :class="goal ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'"
            >
              1
            </div>
            <span class="text-xs text-gray-600 dark:text-gray-400">Setup</span>
          </div>
          <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400" />
          <div class="flex items-center gap-1">
            <div 
              class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors"
              :class="plan ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'"
            >
              2
            </div>
            <span class="text-xs text-gray-600 dark:text-gray-400">Plan</span>
          </div>
          <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400" />
          <div class="flex items-center gap-1">
            <div 
              class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors"
              :class="inputData && plan ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'"
            >
              3
            </div>
            <span class="text-xs text-gray-600 dark:text-gray-400">Execute</span>
          </div>
          <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400" />
          <div class="flex items-center gap-1">
            <div 
              class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors"
              :class="result ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'"
            >
              4
            </div>
            <span class="text-xs text-gray-600 dark:text-gray-400">Results</span>
          </div>
        </div>
      </div>

      <!-- Tabbed Interface -->
      <UTabs 
        v-model="activeTab"
        :items="tabItems" 
        variant="pill"
        size="md"
        class="w-full"
        default-value="setup"
      >
        <!-- Setup Tab -->
        <template #setup>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Goal Section -->
            <div>
              <UCard>
                <template #header>
                  <h3 class="font-semibold text-gray-900 dark:text-white">Define Goal</h3>
                </template>
                <div class="space-y-4">
                  <UFormField label="What would you like to achieve?" required>
                    <UTextarea
                      v-model="goal"
                      placeholder="e.g., Analyze customer feedback and create an action plan"
                      :rows="3"
                      :disabled="loading"
                      class="w-full"
                    />
                  </UFormField>
                  <div class="flex gap-2">
                    <UButton
                      @click="generatePlan"
                      :loading="generatingPlan"
                      :disabled="!goal || loading"
                      icon="i-heroicons-light-bulb"
                      size="md"
                      class="flex-1"
                    >
                      Generate Plan
                    </UButton>
                    <UButton
                      icon="i-heroicons-sparkles"
                      variant="soft"
                      size="md"
                      @click="loadExample"
                      :disabled="loading"
                    >
                      Load Example
                    </UButton>
                  </div>
                  <div v-if="plan" class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div class="flex items-center gap-2">
                      <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-green-500" />
                      <span class="text-sm text-green-700 dark:text-green-300">
                        Plan generated with {{ plan.nodes.length }} steps
                      </span>
                    </div>
                  </div>
                  
                  <!-- Import Plan Section -->
                  <USeparator label="OR" />
                  
                  <div>
                    <UFormField label="Import Existing Plan" description="Paste a previously exported plan JSON">
                      <UTextarea
                        v-model="importPlanJson"
                        placeholder='Paste plan JSON here...'
                        :rows="6"
                        :disabled="loading"
                        class="w-full font-mono text-xs"
                      />
                    </UFormField>
                    <div class="flex gap-2 mt-2">
                      <UButton
                        @click="importPlan"
                        :disabled="!importPlanJson || loading"
                        icon="i-heroicons-arrow-down-tray"
                        size="sm"
                        variant="soft"
                        class="flex-1"
                      >
                        Import Plan
                      </UButton>
                      <UButton
                        v-if="importPlanJson"
                        @click="importPlanJson = ''"
                        icon="i-heroicons-x-mark"
                        size="sm"
                        variant="ghost"
                      >
                        Clear
                      </UButton>
                    </div>
                  </div>
                </div>
              </UCard>
            </div>

            <!-- Documents Section -->
            <div>
              <UCard v-if="documents">
                <template #header>
                  <div class="flex items-center justify-between">
                    <div>
                      <h3 class="font-semibold text-gray-900 dark:text-white">{{ documents.title }}</h3>
                      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ documents.description }}</p>
                    </div>
                    <UBadge variant="soft" size="xs">
                      {{ selectedDocIds.length }}/{{ documents.documents.length }}
                    </UBadge>
                  </div>
                </template>

                <div class="space-y-3">
                  <!-- Quick Actions -->
                  <div class="flex gap-2">
                    <UButton
                      @click="selectedDocIds = documents.documents.map((d: any) => d.id); updateInputFromDocuments()"
                      variant="soft"
                      size="xs"
                    >
                      Select All
                    </UButton>
                    <UButton
                      @click="selectedDocIds = []; updateInputFromDocuments()"
                      variant="soft"
                      size="xs"
                    >
                      Clear
                    </UButton>
                  </div>

                  <!-- Documents List -->
                  <div class="max-h-[400px] overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-800 rounded-lg p-2">
                    <div
                      v-for="doc in documents.documents"
                      :key="doc.id"
                      class="p-2 rounded-md border cursor-pointer transition-colors text-xs group"
                      :class="{
                        'border-primary-500 bg-primary-50 dark:bg-primary-900/20': selectedDocIds.includes(doc.id),
                        'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800': !selectedDocIds.includes(doc.id)
                      }"
                      @click="toggleDocument(doc.id)"
                    >
                      <div class="flex items-start justify-between gap-2">
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-1 mb-1">
                            <UBadge :color="doc.type === 'report' ? 'primary' : doc.type === 'email' ? 'success' : doc.type === 'news' ? 'info' : doc.type === 'social' ? 'warning' : doc.type === 'memo' ? 'secondary' : 'neutral'" size="xs">
                              {{ doc.type }}
                            </UBadge>
                            <span class="text-gray-500">{{ doc.id }}</span>
                          </div>
                          <div class="font-medium text-gray-900 dark:text-white truncate">
                            {{ doc.subject || doc.author }}
                          </div>
                          <div class="text-gray-600 dark:text-gray-400 line-clamp-1">
                            {{ doc.content.substring(0, 100) }}...
                          </div>
                        </div>
                        <div class="flex items-center gap-1 flex-shrink-0">
                          <UModal>
                            <UButton
                              icon="i-heroicons-eye"
                              variant="ghost"
                              size="xs"
                              class="opacity-0 group-hover:opacity-100 transition-opacity"
                              @click.stop
                            />
                            
                            <template #content>
                              <div class="p-6">
                                <div class="space-y-4">
                                  <!-- Document Header -->
                                  <div class="border-b border-gray-200 dark:border-gray-800 pb-4">
                                    <div class="flex items-center gap-2 mb-2">
                                      <UBadge 
                                        :color="doc.type === 'report' ? 'primary' : doc.type === 'email' ? 'success' : doc.type === 'news' ? 'info' : doc.type === 'social' ? 'warning' : doc.type === 'memo' ? 'secondary' : 'neutral'"
                                      >
                                        {{ doc.type }}
                                      </UBadge>
                                      <span class="text-sm text-gray-500">{{ doc.id }}</span>
                                    </div>
                                    <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                                      {{ doc.subject || doc.title || 'Document' }}
                                    </h3>
                                    <div class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                      <div v-if="doc.author">
                                        <span class="font-medium">Author:</span> {{ doc.author }}
                                      </div>
                                      <div v-if="doc.recipient">
                                        <span class="font-medium">To:</span> {{ doc.recipient }}
                                      </div>
                                      <div v-if="doc.timestamp">
                                        <span class="font-medium">Date:</span> {{ doc.timestamp }}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <!-- Document Content -->
                                  <div class="prose prose-sm dark:prose-invert max-w-none">
                                    <div class="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                                      {{ doc.content }}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </template>
                          </UModal>
                          <UIcon
                            :name="selectedDocIds.includes(doc.id) ? 'i-heroicons-check-circle-solid' : 'i-heroicons-circle-20-solid'"
                            class="w-4 h-4"
                            :class="selectedDocIds.includes(doc.id) ? 'text-primary-500' : 'text-gray-400'"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </UCard>
            </div>
          </div>
        </template>

        <!-- Plan Tab -->
        <template #plan>
          <div v-if="!plan" class="flex flex-col items-center justify-center py-12">
            <UIcon name="i-heroicons-light-bulb" class="w-12 h-12 text-gray-400 mb-4" />
            <p class="text-gray-600 dark:text-gray-400">No plan generated yet</p>
            <p class="text-sm text-gray-500 dark:text-gray-500 mt-2">Go to Setup tab to generate a plan</p>
          </div>
          <div v-else>
            <!-- Asset Generation Bar -->
            <div v-if="!assetsGenerated" class="mb-6">
              <UCard>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <UIcon name="i-heroicons-cpu-chip" class="w-5 h-5 text-primary" />
                    <div>
                      <h4 class="font-medium text-gray-900 dark:text-white">Generate Execution Assets</h4>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        Create optimized prompts and parameters for each step
                      </p>
                    </div>
                  </div>
                  <UButton
                    @click="generateAssets"
                    :loading="generatingAssets"
                    :disabled="loading"
                    icon="i-heroicons-sparkles"
                    size="sm"
                  >
                    Generate Assets
                  </UButton>
                </div>
              </UCard>
            </div>
            
            <!-- Asset Generation Success -->
            <div v-else class="mb-6">
              <UAlert color="success" icon="i-heroicons-check-circle" variant="subtle">
                <template #title>Assets Generated</template>
                <template #description>
                  <div class="flex items-center justify-between">
                    <span>Generated execution assets for {{ plan.nodes.length }} steps</span>
                    <div class="flex items-center gap-2">
                      <UBadge color="success" variant="soft" size="xs">
                        Est. cost: ${{ totalEstimatedCost.toFixed(4) }}
                      </UBadge>
                      <UButton
                        icon="i-heroicons-arrow-path"
                        variant="ghost"
                        size="xs"
                        @click="generateAssets"
                        :loading="generatingAssets"
                      >
                        Regenerate
                      </UButton>
                    </div>
                  </div>
                </template>
              </UAlert>
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <!-- Plan Visualization -->
              <UCard>
                <template #header>
                  <div class="flex items-center justify-between">
                    <h3 class="font-semibold text-gray-900 dark:text-white">Plan Visualization</h3>
                    <div class="flex items-center gap-2">
                      <UBadge v-if="assetsGenerated" color="success" variant="soft" size="xs">
                        Assets Ready
                      </UBadge>
                      <UButton
                        icon="i-heroicons-arrows-pointing-out"
                        variant="ghost"
                        size="xs"
                        @click="showPlanVisualization = !showPlanVisualization"
                      >
                        {{ showPlanVisualization ? 'Collapse' : 'Expand' }}
                      </UButton>
                    </div>
                  </div>
                </template>
                <div class="h-[500px] overflow-auto">
                  <PlanVisualization :plan="plan" :completed-nodes="completedNodes" />
                  
                  <!-- Node Status Indicators -->
                  <div v-if="assetsGenerated" class="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <h4 class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Asset Status</h4>
                    <div class="space-y-2">
                      <div v-for="node in plan.nodes" :key="node.id" class="flex items-center justify-between text-xs">
                        <div class="flex items-center gap-2">
                          <UIcon 
                            :name="node.assetStatus === 'ready' ? 'i-heroicons-check-circle-solid' : 
                                   node.assetStatus === 'error' ? 'i-heroicons-x-circle-solid' : 
                                   node.assetStatus === 'generating' ? 'i-heroicons-arrow-path' : 
                                   'i-heroicons-circle'"
                            :class="node.assetStatus === 'ready' ? 'text-success-500' : 
                                    node.assetStatus === 'error' ? 'text-error-500' : 
                                    node.assetStatus === 'generating' ? 'text-primary-500 animate-spin' : 
                                    'text-gray-400'"
                            class="w-4 h-4"
                          />
                          <span class="font-mono">{{ node.id }}</span>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="text-gray-500">{{ node.model || 'gpt-4.1-nano' }}</span>
                          <span v-if="node.asset?.estimatedCost" class="text-gray-400">
                            ${{ node.asset.estimatedCost.toFixed(4) }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </UCard>

              <!-- Plan Details and Assets -->
              <UCard>
                <template #header>
                  <div class="flex items-center justify-between">
                    <h3 class="font-semibold text-gray-900 dark:text-white">
                      {{ showAssetDetails && assetsGenerated ? 'Generated Assets' : 'Plan Details' }}
                    </h3>
                    <div class="flex items-center gap-2">
                      <UButton
                        icon="i-heroicons-clipboard-document"
                        variant="ghost"
                        size="xs"
                        @click="copyPlanToClipboard"
                      >
                        Copy Plan
                      </UButton>
                      <UButton
                        v-if="assetsGenerated"
                        icon="i-heroicons-cpu-chip"
                        variant="ghost"
                        size="xs"
                        @click="showAssetDetails = !showAssetDetails"
                      >
                        {{ showAssetDetails ? 'Show Plan' : 'Show Assets' }}
                      </UButton>
                      <UButton
                        icon="i-heroicons-pencil"
                        variant="ghost"
                        size="xs"
                        @click="editingPlan = !editingPlan"
                        v-if="!showAssetDetails"
                      >
                        {{ editingPlan ? 'Save' : 'Edit' }}
                      </UButton>
                    </div>
                  </div>
                </template>
                <div v-if="showAssetDetails && assetsGenerated" class="h-[500px] overflow-auto">
                  <!-- Asset Details View -->
                  <div class="space-y-4 p-2">
                    <div v-for="node in plan.nodes" :key="node.id" class="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div class="flex items-center justify-between mb-2">
                        <h5 class="font-medium text-sm text-gray-900 dark:text-white">{{ node.id }}</h5>
                        <UBadge 
                          :color="node.assetStatus === 'ready' ? 'success' : 'warning'" 
                          variant="soft" 
                          size="xs"
                        >
                          {{ node.assetStatus }}
                        </UBadge>
                      </div>
                      
                      <div v-if="node.asset" class="space-y-2 text-xs">
                        <!-- Generated Prompt -->
                        <div>
                          <span class="font-semibold text-gray-600 dark:text-gray-400">Prompt:</span>
                          <pre class="mt-1 p-2 bg-gray-50 dark:bg-gray-900 rounded text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ node.asset.generatedPrompt || node.promptTemplate }}</pre>
                        </div>
                        
                        <!-- Parameters -->
                        <div v-if="node.asset.parameters">
                          <span class="font-semibold text-gray-600 dark:text-gray-400">Parameters:</span>
                          <div class="mt-1 flex flex-wrap gap-2">
                            <UBadge variant="outline" size="xs" v-if="node.asset.parameters.temperature !== undefined">
                              temp: {{ node.asset.parameters.temperature }}
                            </UBadge>
                            <UBadge variant="outline" size="xs" v-if="node.asset.parameters.maxTokens">
                              max: {{ node.asset.parameters.maxTokens }}
                            </UBadge>
                            <UBadge variant="outline" size="xs" v-if="node.asset.parameters.topP !== undefined">
                              top-p: {{ node.asset.parameters.topP }}
                            </UBadge>
                          </div>
                        </div>
                        
                        <!-- Cost Estimate -->
                        <div v-if="node.asset.estimatedTokens">
                          <span class="font-semibold text-gray-600 dark:text-gray-400">Estimates:</span>
                          <span class="ml-2 text-gray-500">
                            ~{{ node.asset.estimatedTokens.prompt }} prompt / {{ node.asset.estimatedTokens.completion }} completion tokens
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else-if="editingPlan && !showAssetDetails">
                  <UTextarea
                    v-model="planJson"
                    :rows="20"
                    class="font-mono text-xs"
                    @blur="updatePlan"
                  />
                </div>
                <div v-else class="h-[500px] overflow-auto">
                  <pre class="text-xs p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">{{ JSON.stringify(plan, null, 2) }}</pre>
                </div>
              </UCard>
            </div>
          </div>
        </template>

        <!-- Execute Tab -->
        <template #execute>
          <div v-if="!plan" class="flex flex-col items-center justify-center py-12">
            <UIcon name="i-heroicons-play" class="w-12 h-12 text-gray-400 mb-4" />
            <p class="text-gray-600 dark:text-gray-400">Generate a plan first</p>
            <p class="text-sm text-gray-500 dark:text-gray-500 mt-2">Go to Setup tab to create an execution plan</p>
          </div>
          <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Input Section -->
            <UCard>
              <template #header>
                <h3 class="font-semibold text-gray-900 dark:text-white">Input Data</h3>
              </template>
              <div class="space-y-4">
                <UFormField label="Provide the data to process" required>
                  <UTextarea
                    v-model="inputData"
                    :rows="15"
                    placeholder="Enter your data here or select documents from the Setup tab..."
                    :disabled="loading"
                    class="w-full font-mono text-xs"
                  />
                </UFormField>
                <UButton
                  @click="executePlan"
                  :loading="executingPlan"
                  :disabled="!inputData || loading"
                  icon="i-heroicons-play"
                  size="md"
                  block
                >
                  Execute Plan{{ assetsGenerated ? ' (Using Generated Assets)' : '' }}
                </UButton>
              </div>
            </UCard>

            <!-- Execution Status -->
            <UCard>
              <template #header>
                <h3 class="font-semibold text-gray-900 dark:text-white">Execution Progress</h3>
              </template>
              <div class="space-y-4">
                <!-- Progress -->
                <div v-if="executionInProgress" class="space-y-3">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 text-primary animate-spin" />
                    <span class="text-sm">Executing plan...</span>
                  </div>
                  <UProgress :value="executionProgress" />
                </div>

                <!-- Completed Steps -->
                <div class="space-y-2">
                  <p class="text-sm font-medium">Steps:</p>
                  <div class="space-y-1 max-h-[350px] overflow-y-auto">
                    <div
                      v-for="node in plan.nodes"
                      :key="node.id"
                      class="flex items-center gap-2 text-sm p-2 rounded-md"
                      :class="{
                        'bg-green-50 dark:bg-green-900/20': completedNodes.includes(node.id),
                        'bg-gray-50 dark:bg-gray-900': !completedNodes.includes(node.id)
                      }"
                    >
                      <UIcon 
                        :name="completedNodes.includes(node.id) ? 'i-heroicons-check-circle' : 'i-heroicons-circle-20-solid'"
                        :class="completedNodes.includes(node.id) ? 'text-green-500' : 'text-gray-400'"
                        class="w-4 h-4"
                      />
                      <span :class="completedNodes.includes(node.id) ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'">
                        {{ node.description }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Stats -->
                <div v-if="result" class="pt-3 border-t border-gray-200 dark:border-gray-800">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <p class="text-xs text-gray-500">Execution Time</p>
                      <p class="text-sm font-medium">{{ formatTime(result.executionTime) }}</p>
                    </div>
                    <div v-if="result.totalCost">
                      <p class="text-xs text-gray-500">Cost</p>
                      <p class="text-sm font-medium">${{ result.totalCost.toFixed(4) }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </UCard>
          </div>
        </template>

        <!-- Results Tab -->
        <template #results>
          <div v-if="!result" class="flex flex-col items-center justify-center py-12">
            <UIcon name="i-heroicons-document-text" class="w-12 h-12 text-gray-400 mb-4" />
            <p class="text-gray-600 dark:text-gray-400">No results yet</p>
            <p class="text-sm text-gray-500 dark:text-gray-500 mt-2">Execute a plan to see results</p>
          </div>
          <ExecutionResults v-else :result="result" :plan="plan" />
        </template>
      </UTabs>
    </div>

    <!-- Debug Slideover -->
    <USlideover v-model:open="showDebug" title="Debug: All Artifacts" description="View all intermediate results from plan execution">
      <template #default>
        <div class="fixed bottom-4 right-4">
          <UButton
            icon="i-heroicons-bug-ant"
            variant="outline"
            color="neutral"
            size="xs"
            :disabled="!result"
          >
            Debug
          </UButton>
        </div>
      </template>

      <template #body>
        <div v-if="result" class="space-y-4">
          <!-- Execution Summary -->
          <div class="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h4 class="font-medium text-sm text-gray-900 dark:text-white mb-3">Execution Summary</h4>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400">Execution Time</p>
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ formatTime(result.executionTime) }}
                </p>
              </div>
              <div v-if="result.totalCost">
                <p class="text-xs text-gray-500 dark:text-gray-400">Estimated Cost</p>
                <p class="font-medium text-gray-900 dark:text-white">
                  ${{ result.totalCost.toFixed(4) }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400">Total Nodes</p>
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ plan?.nodes.length || 0 }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400">Artifacts</p>
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ Object.keys(result.artifacts).length }}
                </p>
              </div>
            </div>
          </div>

          <!-- Artifacts -->
          <div class="space-y-3">
            <div
              v-for="(artifact, nodeId) in result.artifacts"
              :key="nodeId"
              class="border border-gray-200 dark:border-gray-800 rounded-lg p-4"
            >
              <div class="flex items-center justify-between mb-3">
                <h4 class="font-medium text-sm text-gray-900 dark:text-white">
                  {{ getNodeById(String(nodeId))?.description || nodeId }}
                </h4>
                <UBadge variant="outline" size="xs" color="primary">
                  {{ artifact.type }}
                </UBadge>
              </div>
              <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 overflow-x-auto">
                <pre class="text-xs">{{ 
                  typeof artifact.content === 'string' 
                    ? artifact.content 
                    : JSON.stringify(artifact.content, null, 2) 
                }}</pre>
              </div>
              <div class="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span v-if="artifact.metadata.totalTokens">
                  <UIcon name="i-heroicons-cpu-chip" class="w-3 h-3 inline" />
                  {{ artifact.metadata.totalTokens }} tokens
                </span>
                <span v-if="artifact.metadata.model">
                  <UIcon name="i-heroicons-sparkles" class="w-3 h-3 inline" />
                  {{ artifact.metadata.model }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="flex flex-col items-center justify-center h-full text-center p-8">
          <UIcon name="i-heroicons-beaker" class="w-12 h-12 text-gray-400 mb-4" />
          <p class="text-gray-600 dark:text-gray-400">No execution data available</p>
          <p class="text-sm text-gray-500 dark:text-gray-500 mt-2">Execute a plan to see debug information</p>
        </div>
      </template>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import PlanVisualization from '~/components/PlanVisualization.vue'

// Initialize toast at the top of setup
const toast = useToast()

// Define types locally since they're in server directory
interface Artifact {
  type: 'text' | 'json'
  content: string | any
  metadata: {
    nodeId: string
    model?: string
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
    timestamp: number
  }
}

interface ExecutionAsset {
  generatedPrompt?: string
  systemPrompt?: string
  parameters?: {
    temperature?: number
    maxTokens?: number
    topP?: number
    frequencyPenalty?: number
    presencePenalty?: number
  }
  outputSchema?: any
  estimatedCost?: number
  estimatedTokens?: {
    prompt: number
    completion: number
  }
}

interface DAGNode {
  id: string
  description: string
  inputs: string[]
  promptTemplate: string
  outputType: 'text' | 'json'
  jsonSchema?: any
  model?: string
  temperature?: number
  systemPrompt?: string
  // Asset generation fields
  asset?: ExecutionAsset
  assetStatus?: 'pending' | 'generating' | 'ready' | 'error'
  assetError?: string
}

interface Plan {
  goal: string
  nodes: DAGNode[]
  finalOutput: string
}

interface ExecutionResult {
  plan: Plan
  artifacts: Record<string, Artifact>
  finalOutput: Artifact
  executionTime: number
  totalCost?: number
}

// State
const goal = ref('')
const inputData = ref('')
const plan = ref<Plan | null>(null)
const planJson = ref('')
const result = ref<any>(null)
const loading = ref(false)
const generatingPlan = ref(false)
const executingPlan = ref(false)
const editingPlan = ref(false)
const showPlanVisualization = ref(true)
const showDebug = ref(false)
const executionInProgress = ref(false)
const completedNodes = ref<string[]>([])
const documents = ref<any>(null)
const loadingDocuments = ref(false)
const selectedDocIds = ref<string[]>([])
const showDocuments = ref(false)
const apiKeyStatus = ref<'active' | 'simulation'>('simulation')
const activeTab = ref('setup')
const generatingAssets = ref(false)
const assetsGenerated = ref(false)
const totalEstimatedCost = ref(0)
const showAssetDetails = ref(false)
const importPlanJson = ref('')

// Computed
const canReset = computed(() => goal.value || plan.value || result.value)
const executionProgress = computed(() => {
  if (!plan.value || completedNodes.value.length === 0) return 0
  return (completedNodes.value.length / plan.value.nodes.length) * 100
})

const tabItems = computed(() => [
  {
    label: 'Setup',
    icon: 'i-heroicons-cog-6-tooth',
    slot: 'setup',
    value: 'setup',
    badge: selectedDocIds.value.length > 0 ? selectedDocIds.value.length : undefined
  },
  {
    label: 'Plan',
    icon: 'i-heroicons-light-bulb',
    slot: 'plan',
    value: 'plan',
    badge: plan.value ? plan.value.nodes.length : undefined
  },
  {
    label: 'Execute',
    icon: 'i-heroicons-play',
    slot: 'execute',
    value: 'execute',
    disabled: !plan.value
  },
  {
    label: 'Results',
    icon: 'i-heroicons-document-text',
    slot: 'results',
    value: 'results',
    badge: result.value ? '✓' : undefined,
    disabled: !result.value
  }
])

// Methods
const generatePlan = async () => {
  if (!goal.value) return

  generatingPlan.value = true
  loading.value = true
  result.value = null
  completedNodes.value = []

  try {
    const response = await $fetch('/api/ragdag/generate-plan', {
      method: 'POST',
      body: { goal: goal.value }
    })

    if (response.success && response.plan) {
      plan.value = response.plan
      planJson.value = JSON.stringify(response.plan, null, 2)
      
      // Show success notification
      toast.add({
        title: 'Plan Generated',
        description: `Created ${response.plan.nodes.length} step execution plan ${apiKeyStatus.value === 'simulation' ? '(Simulation Mode)' : '(AI Generated)'}`,
        color: apiKeyStatus.value === 'simulation' ? 'warning' : 'primary'
      })
      
      // Auto-switch to plan tab
      activeTab.value = 'plan'
    }
  } catch (error: any) {
    console.error('Error generating plan:', error)
    toast.add({
      title: 'Generation Failed',
      description: error.data?.statusMessage || 'Failed to generate plan',
      color: 'error'
    })
  } finally {
    generatingPlan.value = false
    loading.value = false
  }
}

const generateAssets = async () => {
  if (!plan.value) return

  generatingAssets.value = true
  loading.value = true

  try {
    const response = await $fetch('/api/ragdag/generate-assets', {
      method: 'POST',
      body: {
        plan: plan.value,
        sampleInput: inputData.value || selectedDocIds.value.length > 0 ? 
          'Sample document content for context...\n' + inputData.value.substring(0, 500) : undefined
      }
    })

    if (response.plan) {
      plan.value = response.plan
      planJson.value = JSON.stringify(response.plan, null, 2)
      assetsGenerated.value = true
      totalEstimatedCost.value = response.totalEstimatedCost
      
      // Show success notification
      toast.add({
        title: 'Assets Generated',
        description: `Generated execution assets for ${response.plan.nodes.length} steps. Estimated cost: $${response.totalEstimatedCost.toFixed(4)}`,
        color: 'success'
      })
    }
  } catch (error: any) {
    console.error('Error generating assets:', error)
    toast.add({
      title: 'Asset Generation Failed',
      description: error.data?.statusMessage || 'Failed to generate assets',
      color: 'error'
    })
  } finally {
    generatingAssets.value = false
    loading.value = false
  }
}

const executePlan = async () => {
  if (!plan.value || !inputData.value) return

  executingPlan.value = true
  executionInProgress.value = true
  loading.value = true
  completedNodes.value = []
  
  // Use enhanced execution with real-time progress
  const useStreamingExecution = true

  try {
    // Use enhanced execution API with better performance tracking
    const response = await $fetch('/api/ragdag/execute-enhanced', {
      method: 'POST',
      body: {
        plan: plan.value,
        input: inputData.value
      }
    })

    if (response.success && response.result) {
      result.value = response.result
      completedNodes.value = plan.value.nodes.map((n: DAGNode) => n.id)
      
      // Show enhanced metrics
      const analytics = response.analytics
      const cacheRate = analytics.cachingStats.hitRate * 100
      
      toast.add({
        title: 'Execution Complete',
        description: `Processed in ${formatTime(response.result.executionTime)} | ${analytics.parallelBatches} parallel batches | ${cacheRate.toFixed(1)}% cache hit rate | $${response.result.totalCost?.toFixed(4) || '0.0000'}`,
        color: 'success'
      })
      
      // Show additional insights if available
      if (analytics.criticalPath && analytics.criticalPath.length > 0) {
        console.log('Critical path:', analytics.criticalPath.join(' → '))
      }
      
      // Auto-switch to results tab
      activeTab.value = 'results'
    }
  } catch (error: any) {
    console.error('Error executing plan:', error)
    toast.add({
      title: 'Execution Failed',
      description: error.data?.statusMessage || 'Failed to execute plan',
      color: 'error'
    })
  } finally {
    executingPlan.value = false
    executionInProgress.value = false
    loading.value = false
  }
}

const updatePlan = () => {
  try {
    plan.value = JSON.parse(planJson.value)
    editingPlan.value = false
    
    toast.add({
      title: 'Plan Updated',
      description: 'Successfully updated the execution plan',
      color: 'primary'
    })
  } catch (error) {
    toast.add({
      title: 'Invalid JSON',
      description: 'Please fix the JSON syntax and try again',
      color: 'error'
    })
  }
}

const getNodeById = (nodeId: string): DAGNode | undefined => {
  return plan.value?.nodes.find((n: DAGNode) => n.id === nodeId)
}

const formatTime = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}min`
}

const copyResult = async () => {
  if (!result.value) return
  
  const content = typeof result.value.finalOutput.content === 'string'
    ? result.value.finalOutput.content
    : JSON.stringify(result.value.finalOutput.content, null, 2)
  
  await navigator.clipboard.writeText(content)
  
  toast.add({
    title: 'Copied',
    description: 'Result copied to clipboard',
    color: 'primary'
  })
}

const reset = () => {
  goal.value = ''
  inputData.value = ''
  plan.value = null
  planJson.value = ''
  result.value = null
  completedNodes.value = []
  editingPlan.value = false
  showPlanVisualization.value = true
  activeTab.value = 'setup'
  assetsGenerated.value = false
  totalEstimatedCost.value = 0
}

// Check API status on mount
onMounted(() => {
  checkApiKeyStatus()
})

const loadExample = async () => {
  // First load the documents
  await loadDocuments()
  
  // Set up an investigation goal
  goal.value = 'Investigate the Pineapple Crisis: uncover timeline contradictions, identify cover-up attempts, analyze sentiment shifts, and determine the true nature of the phenomenon'
  
  // Select all documents for the investigation
  if (documents.value) {
    selectedDocIds.value = documents.value.documents.map((d: any) => d.id)
    updateInputFromDocuments()
  }
  
  toast.add({
    title: 'Investigation Loaded',
    description: 'Pineapple Crisis documents loaded. Click "Generate Plan" to begin investigation.',
    color: 'primary'
  })
}

const loadDocuments = async () => {
  loadingDocuments.value = true
  try {
    documents.value = await $fetch('/api/ragdag/documents')
    showDocuments.value = true
  } catch (error) {
    console.error('Failed to load documents:', error)
    toast.add({
      title: 'Failed to load documents',
      description: 'Could not fetch the document collection',
      color: 'error'
    })
  } finally {
    loadingDocuments.value = false
  }
}

const updateInputFromDocuments = () => {
  if (!documents.value) return
  
  const selected = documents.value.documents.filter((d: any) => 
    selectedDocIds.value.includes(d.id)
  )
  
  if (selected.length === 0) {
    inputData.value = ''
    return
  }
  
  // Format documents for input
  inputData.value = selected.map((doc: any) => {
    return `[${doc.id}] ${doc.type.toUpperCase()} - ${doc.timestamp}
Author: ${doc.author}${doc.recipient ? `\nTo: ${doc.recipient}` : ''}${doc.subject ? `\nSubject: ${doc.subject}` : ''}

${doc.content}`
  }).join('\n\n---\n\n')
}

const checkApiKeyStatus = async () => {
  try {
    // Make a test call to check if API key is configured
    const response = await $fetch('/api/ragdag/check-api-status', {
      method: 'GET'
    }).catch(() => null)
    
    if (response && response.hasApiKey) {
      apiKeyStatus.value = 'active'
    } else {
      apiKeyStatus.value = 'simulation'
    }
  } catch (error) {
    apiKeyStatus.value = 'simulation'
  }
}

const toggleDocument = (docId: string) => {
  const index = selectedDocIds.value.indexOf(docId)
  if (index > -1) {
    selectedDocIds.value.splice(index, 1)
  } else {
    selectedDocIds.value.push(docId)
  }
  updateInputFromDocuments()
}

const copyPlanToClipboard = async () => {
  if (!plan.value) return
  
  try {
    const planExport = JSON.stringify(plan.value, null, 2)
    await navigator.clipboard.writeText(planExport)
    
    toast.add({
      title: 'Plan Copied',
      description: `Copied plan with ${plan.value.nodes.length} steps to clipboard${assetsGenerated.value ? ' (including generated assets)' : ''}`,
      color: 'success'
    })
  } catch (error) {
    console.error('Error copying plan:', error)
    toast.add({
      title: 'Copy Failed',
      description: 'Failed to copy plan to clipboard',
      color: 'error'
    })
  }
}

const importPlan = () => {
  if (!importPlanJson.value) return
  
  try {
    const importedPlan = JSON.parse(importPlanJson.value) as Plan
    
    // Validate basic plan structure
    if (!importedPlan.goal || !importedPlan.nodes || !Array.isArray(importedPlan.nodes)) {
      throw new Error('Invalid plan format: missing goal or nodes array')
    }
    
    if (!importedPlan.finalOutput) {
      throw new Error('Invalid plan format: missing finalOutput')
    }
    
    // Check if assets have been generated by examining node properties
    let hasAssets = false
    let readyAssetCount = 0
    
    importedPlan.nodes.forEach(node => {
      if (node.asset && node.asset.generatedPrompt) {
        hasAssets = true
      }
      if (node.assetStatus === 'ready') {
        readyAssetCount++
      }
    })
    
    // Update state
    plan.value = importedPlan
    goal.value = importedPlan.goal
    planJson.value = JSON.stringify(importedPlan, null, 2)
    assetsGenerated.value = hasAssets && readyAssetCount === importedPlan.nodes.length
    
    // Calculate total estimated cost if assets exist
    if (hasAssets) {
      totalEstimatedCost.value = importedPlan.nodes.reduce((sum, node) => {
        return sum + (node.asset?.estimatedCost || 0)
      }, 0)
    }
    
    // Clear import field
    importPlanJson.value = ''
    
    // Show success notification
    let description = `Imported plan with ${importedPlan.nodes.length} steps`
    if (hasAssets) {
      description += `. ${readyAssetCount}/${importedPlan.nodes.length} assets ready`
    }
    
    toast.add({
      title: 'Plan Imported',
      description,
      color: 'success'
    })
    
    // Switch to plan tab
    activeTab.value = 'plan'
  } catch (error: any) {
    console.error('Error importing plan:', error)
    toast.add({
      title: 'Import Failed',
      description: error.message || 'Invalid plan JSON format',
      color: 'error'
    })
  }
}

// Watch for plan changes
watch(plan, (newPlan) => {
  if (newPlan) {
    planJson.value = JSON.stringify(newPlan, null, 2)
  }
})

// Load documents on mount
onMounted(() => {
  loadDocuments()
})
</script>