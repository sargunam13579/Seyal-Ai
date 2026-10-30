export interface DataControlSettings {
  strictLocalOnly: boolean;
  anonymousDiagnostics: boolean;
  ephemeralIncognitoMode: boolean;
  cloudProfileSync: boolean;
}

export const defaultDataControlSettings: DataControlSettings = {
  strictLocalOnly: true,
  anonymousDiagnostics: false,
  ephemeralIncognitoMode: false,
  cloudProfileSync: true,
};
