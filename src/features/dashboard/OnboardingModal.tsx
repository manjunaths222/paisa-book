import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Modal } from '../../shared/components/ui';
import { useAuth } from '../../shared/hooks/useAuth';

export function OnboardingModal() {
  const { user, completeOnboarding } = useAuth();
  const [step, setStep] = useState(0);
  const dismissed = user ? localStorage.getItem(`paisa-book:${user.uid}:onboarding-dismissed`) === 'true' : false;
  if (!user || user.onboardingComplete || dismissed) return null;
  const steps = [
    {
      title: 'Welcome to Paisa Book',
      body: `Your self profile is ready as ${user.displayName}. Add family profiles and instruments to build your household ledger.`
    },
    {
      title: 'Add family members',
      body: 'Create member profiles for spouse, children, parents, or siblings. Members do not need app logins.'
    },
    {
      title: 'Add the first instrument',
      body: 'Start with any FD, RD, stock, mutual fund, loan, insurance policy, PPF, SSA, or custom saving.'
    }
  ];
  return (
    <Modal
      open
      title={steps[step].title}
      onClose={completeOnboarding}
      footer={
        <div className="flex justify-between gap-3">
          <Button type="button" variant="ghost" onClick={completeOnboarding}>
            Skip
          </Button>
          {step < steps.length - 1 ? (
            <Button type="button" onClick={() => setStep(step + 1)}>
              Next
            </Button>
          ) : (
            <Link to="/instruments/add" onClick={completeOnboarding}>
              <Button>Add Instrument</Button>
            </Link>
          )}
        </div>
      }
    >
      <p className="text-sm leading-6 text-slate-700">{steps[step].body}</p>
    </Modal>
  );
}
