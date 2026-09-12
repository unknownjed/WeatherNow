export interface AppInstallPrompt {
  prompt(): Promise<unknown>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export async function requestAppInstall(prompt: AppInstallPrompt): Promise<'accepted' | 'dismissed'> {
  // Called directly from the Install click, retaining browser user activation.
  await prompt.prompt();
  return (await prompt.userChoice).outcome;
}
