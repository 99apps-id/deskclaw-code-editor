import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import {
  useWizardStore,
  WIZARD_STEPS,
  WIZARD_STEP_COUNT,
} from '@/stores/wizard-store'
import { StepIndicator } from './StepIndicator'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { WelcomeStep } from './steps/WelcomeStep'
import { ModelStep } from './steps/ModelStep'
import { ChannelStep } from './steps/ChannelStep'
import { GatewayStep } from './steps/GatewayStep'
import { CompleteStep } from './steps/CompleteStep'
import { ChevronLeft, ChevronRight, Code2, Rocket, SkipForward } from 'lucide-react'
import {
  setAppLocale,
  SHELL_SUPPORTED_LOCALES,
  SHELL_LOCALE_LABELS,
  type ShellLocale,
} from '@/i18n'

const STEP_COMPONENTS = [
  WelcomeStep,
  ModelStep,
  ChannelStep,
  GatewayStep,
  CompleteStep,
] as const

function initialLocaleFromI18n(): ShellLocale {
  const lng = i18n.language
  return (SHELL_SUPPORTED_LOCALES as readonly string[]).includes(lng)
    ? (lng as ShellLocale)
    : 'en'
}

export function WizardLayout() {
  const { t } = useTranslation()
  const store = useWizardStore()
  const { currentStep, completedSteps, deployPhase } = store

  const [uiLocale, setUiLocale] = useState<ShellLocale>(initialLocaleFromI18n)

  useEffect(() => {
    void window.electronAPI?.shellGetConfig?.().then((cfg) => {
      if (cfg.locale && (SHELL_SUPPORTED_LOCALES as readonly string[]).includes(cfg.locale)) {
        setUiLocale(cfg.locale)
      }
    })
  }, [])

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === WIZARD_STEP_COUNT - 1
  const stepDef = WIZARD_STEPS[currentStep]
  const canAdvance = store.isStepValid(currentStep)
  const isDeploying = deployPhase === 'writing' || deployPhase === 'starting'

  const StepContent = STEP_COMPONENTS[currentStep]

  return (
    <div className="workbench-surface grid h-screen min-h-0 grid-rows-[auto_minmax(0,1fr)_52px] select-none bg-[var(--color-paper)]">
      <header className="shrink-0 border-b border-[var(--color-rule)] bg-[var(--color-paper-2)]">
        <div className="mx-auto max-w-5xl px-5 pb-4 pt-4">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--color-accent-strong)]">
                <Code2 className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-2)]">DeskClaw setup</div>
                <h1 className="text-lg font-semibold leading-tight">
                  Configure your OpenClaw workbench
                </h1>
              </div>
            </div>
            <Select
              value={uiLocale}
              onValueChange={(v) => {
                const next = v as ShellLocale
                setUiLocale(next)
                void setAppLocale(next)
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px] shrink-0" aria-label={t('shell.settings.language')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHELL_SUPPORTED_LOCALES.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {SHELL_LOCALE_LABELS[loc]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <StepIndicator
            steps={WIZARD_STEPS}
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={store.goToStep}
          />
        </div>
      </header>

      <main className="workbench-scroll min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-5 py-6">
          <StepContent />
        </div>
      </main>

      <footer className="shrink-0 border-t border-[var(--color-rule)] bg-[var(--color-paper-2)]">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-5">
          <div>
            {!isFirstStep && (
              <Button variant="outline" size="sm" onClick={store.prevStep}>
                <ChevronLeft className="w-4 h-4" />
                {t('wizard.nav.previous')}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {stepDef.skippable && !isLastStep && (
              <Button variant="ghost" size="sm" onClick={store.nextStep}>
                {t('wizard.nav.skip')}
                <SkipForward className="w-4 h-4" />
              </Button>
            )}
            {isLastStep ? (
              deployPhase === 'idle' || deployPhase === 'error' ? (
                <Button
                  size="sm"
                  onClick={() => void store.triggerDeploy(t)}
                  disabled={isDeploying}
                >
                  <Rocket className="w-4 h-4" />
                  {deployPhase === 'error' ? t('wizard.complete.retry') : t('wizard.complete.confirmStart')}
                </Button>
              ) : isDeploying ? (
                <Button size="sm" disabled>
                  <Rocket className="w-4 h-4" />
                  {t('shell.status.starting')}
                </Button>
              ) : null
            ) : (
              <Button
                size="sm"
                onClick={store.nextStep}
                disabled={!canAdvance}
              >
                {isFirstStep ? t('wizard.nav.startSetup') : t('wizard.nav.next')}
                {!isFirstStep && <ChevronRight className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
