export interface ContactContext {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
}

export function resolveTemplateVariables(text: string, contact: ContactContext): string {
  if (!text) return '';
  const firstName = contact.firstName || '';
  const lastName = contact.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim() || contact.email;
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();

  return text
    .replace(/#NAME#/g, fullName)
    .replace(/#FIRSTNAME#/g, firstName || 'there')
    .replace(/#LASTNAME#/g, lastName)
    .replace(/#EMAIL#/g, contact.email)
    .replace(/#PHONE#/g, contact.phone || '')
    .replace(/#COMPANY#/g, contact.company || 'your company')
    .replace(/#RANDOM#/g, randomStr);
}
