/**
 * De quizmastercode.
 *
 * Zodra de app op een publiek adres draait, kan iedereen met de link erbij.
 * Met een code blijft het quizmaster-dashboard van jou; spelers merken er
 * niets van.
 *
 * De code komt uit de omgevingsvariabele QUIZMASTER_CODE (zo staat ze niet in
 * de code op GitHub). Is er geen code ingesteld - bijvoorbeeld wanneer je thuis
 * op je eigen laptop draait - dan wordt er niets gevraagd.
 */

const configuredCode = String(process.env.QUIZMASTER_CODE || '').trim();

/** Is er een code nodig om quizmaster te worden? */
export function isCodeRequired() {
  return configuredCode.length > 0;
}

/** Klopt de ingegeven code? Zonder ingestelde code mag iedereen. */
export function isCodeValid(code) {
  if (!isCodeRequired()) return true;
  return String(code || '').trim() === configuredCode;
}
