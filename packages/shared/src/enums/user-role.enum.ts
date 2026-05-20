export enum UserRole {
  SUPER_ADMIN   = 'super_admin',
  DENTIST_OWNER = 'dentist_owner',
  DENTIST       = 'dentist',
  RECEPTIONIST  = 'receptionist',
  ASSISTANT     = 'assistant',
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]:   'Super Administrador',
  [UserRole.DENTIST_OWNER]: 'Odontólogo Titular',
  [UserRole.DENTIST]:       'Odontólogo',
  [UserRole.RECEPTIONIST]:  'Recepcionista',
  [UserRole.ASSISTANT]:     'Auxiliar',
};
