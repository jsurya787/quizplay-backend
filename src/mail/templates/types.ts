export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

export interface EmailBranding {
  appName: string;
  appLogoUrl?: string;
  webUrl?: string;
}
