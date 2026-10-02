/**
 * Field limits shared by the schemas, the server actions, the forms and the
 * translated messages.
 *
 * This module is imported by client components, so it deliberately depends on
 * nothing that is server only.
 */
export const LIMITS = {
  taskTitleMax: 200,
  taskDescriptionMax: 4000,
  taskLocationMax: 160,
  waitingReasonMin: 3,
  waitingReasonMax: 500,
  updateContentMax: 2000,
  usernameMin: 3,
  usernameMax: 48,
  nameMax: 120,
  emailMax: 180,
  phoneMax: 24,
  /**
   * Eight characters, with no complexity rule: digits only is a valid choice.
   * The people using Tabea are a family and their workers, several of whom
   * will pick a number they can remember, and a rule that pushes them towards
   * writing a password down would cost more than it buys. Sign in is rate
   * limited per username and hashes use bcrypt at twelve rounds.
   */
  passwordMin: 8,
  projectNameMax: 80,
  searchMax: 120,
} as const;

/**
 * Values injected into translated validation messages. Keeping them here means
 * a limit is changed in one place and both the rule and its message follow.
 */
export const VALIDATION_VARS: Record<string, Record<string, string | number>> = {
  titleTooLong: { max: LIMITS.taskTitleMax },
  updateTooLong: { max: LIMITS.updateContentMax },
  usernameTooShort: { min: LIMITS.usernameMin },
  passwordTooShort: { min: LIMITS.passwordMin },
};
