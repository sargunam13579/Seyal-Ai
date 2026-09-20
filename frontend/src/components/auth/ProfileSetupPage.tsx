import React from 'react';
import { OnboardingWizard } from './OnboardingWizard';

export interface ProfileSetupPageProps {
  onComplete: () => void;
}

export const ProfileSetupPage: React.FC<ProfileSetupPageProps> = ({ onComplete }) => {
  return <OnboardingWizard onComplete={onComplete} />;
};

export default ProfileSetupPage;
