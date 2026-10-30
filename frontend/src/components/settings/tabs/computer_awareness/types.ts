export interface ComputerControlConfig {
  cursorGlideSpeed: 'natural' | 'smooth' | 'instant';
  keystrokeDelayMs: number;
  autoPauseOnUserMouseMove: boolean;
  maskSensitiveInputFields: boolean;
  somGroundingTags: boolean;
  blacklistedApps: string[];
}

export const defaultControlConfig: ComputerControlConfig = {
  cursorGlideSpeed: 'natural',
  keystrokeDelayMs: 35,
  autoPauseOnUserMouseMove: true,
  maskSensitiveInputFields: true,
  somGroundingTags: true,
  blacklistedApps: ['Bitwarden', '1Password', 'KeePass', 'Banking'],
};

export const formatLaptopDateTime = (isoString?: string | null): string => {
  if (!isoString) return '';
  const date = new Date(isoString.includes('T') ? isoString : isoString.replace(' ', 'T'));
  if (isNaN(date.getTime())) return isoString;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const datePart = `${day}/${month}/${year}`;

  const timePart = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return `${datePart} ${timePart}`;
};
