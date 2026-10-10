// Deliberately conservative post-generation guard. This supplements, and does
// not replace, human evaluation or the prompt's explicit no-medical-advice rule.
const unsafeAdvice = /\b(tăng|giảm|ngừng|đổi|bỏ|uống thêm|tự ý)\b.{0,48}\b(thuốc|liều|huyết áp|điều trị)\b|\b(chẩn đoán|bị bệnh|mắc bệnh|suy tim|đột quỵ|tăng huyết áp)\b/i;

export function containsMedicalAdvice(text: string): boolean {
  return unsafeAdvice.test(text);
}

export function assertSafeGeneratedText(text: string): void {
  if (containsMedicalAdvice(text)) throw new Error("UNSAFE_AI_OUTPUT");
}

export function hasThreeOrFourSentences(text: string): boolean {
  const sentences = text.trim().split(/(?<=[.!?])\s+/u).filter(Boolean);
  return sentences.length >= 3 && sentences.length <= 4;
}
