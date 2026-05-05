import { renderLightEmailLayout } from './base.template';
import { EmailBranding, EmailTemplate } from './types';

interface QuizResultTemplateInput extends EmailBranding {
  firstName?: string;
  quizTitle: string;
  score: number;
  totalMarks: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number;
}

export function buildQuizResultEmailTemplate(
  input: QuizResultTemplateInput,
): EmailTemplate {
  const firstName = (input.firstName || 'there').trim();
  const subject = `🎯 ${input.appName}: Your quiz result is ready`;
  const text =
    `Hi ${firstName}, you scored ${input.score} out of ${input.totalMarks} in ${input.quizTitle}. ` +
    `${input.correct} correct, ${input.wrong} wrong, ${input.skipped} skipped. Accuracy: ${input.accuracy}%.`;

  const html = renderLightEmailLayout({
    appName: input.appName,
    appLogoUrl: input.appLogoUrl,
    title: '🎯 Quiz submitted',
    greeting: `Hi ${firstName}, 👋`,
    intro: `Your result for ${input.quizTitle} is ready.`,
    bodyHtml: `
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;margin:0 0 18px 0;">
        <p style="margin:0 0 10px 0;font-size:20px;line-height:1.4;color:#1e3a8a;font-weight:700;">
          You got ${input.score} out of ${input.totalMarks} ✨
        </p>
        <p style="margin:0;font-size:14px;line-height:1.8;color:#1e40af;">
          ✅ Correct: ${input.correct}<br />
          ❌ Wrong: ${input.wrong}<br />
          ⏭️ Skipped: ${input.skipped}<br />
          📊 Accuracy: ${input.accuracy}%
        </p>
      </div>
    `,
    ctaLabel: input.webUrl ? 'View Result' : undefined,
    ctaUrl: input.webUrl,
    footerNote: 'Keep practicing. Every attempt helps you improve. 🚀',
  });

  return { subject, text, html };
}
