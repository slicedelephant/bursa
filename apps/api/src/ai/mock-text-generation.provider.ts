import { Injectable } from '@nestjs/common';
import {
  GenerateRequest,
  GenerateResult,
  TextGenerationProvider,
} from './text-generation-provider.interface';

/**
 * Deterministic mock — no external calls. Produces sensible, varied templated
 * drafts from the built prompt, so the prototype and ALL tests run without a
 * network or an API key. Same request → same output (mirrors how
 * MockPaymentProvider stays deterministic).
 *
 * It does NOT try to be a real LLM: it detects the kind/locale from the prompt
 * text and emits hand-written template variants. The pure ranking + tone cores
 * then clean and rank whatever it returns.
 */
@Injectable()
export class MockTextGenerationProvider implements TextGenerationProvider {
  readonly name = 'mock';

  async generate(request: GenerateRequest): Promise<GenerateResult> {
    const text = `${request.prompt.system}\n${request.prompt.user}`;
    const isGerman = /Deutsch|Umlauten|Varianten/i.test(text);
    const kind = this.detectKind(text);
    const seed = request.seed ?? text;
    const all = this.templatesFor(kind, isGerman, seed);
    const variants = this.pick(all, request.variants, seed);
    return { variants, provider: this.name };
  }

  private detectKind(text: string): 'title' | 'story' | 'share' {
    if (
      /3 short paragraphs|3 kurzen Absätzen|funding gap|Finanzierungslücke/i.test(
        text,
      )
    ) {
      return 'story';
    }
    if (
      /WhatsApp|LinkedIn|subject line|Betreff|social-share|Social-Share/i.test(
        text,
      )
    ) {
      return 'share';
    }
    return 'title';
  }

  /** Stable 0..n index from a string seed (no randomness). */
  private hash(seed: string): number {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return h;
  }

  /** Rotate the template list by a seeded offset so output varies by input. */
  private pick(all: string[], n: number, seed: string): string[] {
    if (all.length === 0) {
      return [];
    }
    const offset = this.hash(seed) % all.length;
    const out: string[] = [];
    for (let i = 0; i < Math.max(1, n); i++) {
      out.push(all[(offset + i) % all.length]);
    }
    return out;
  }

  private templatesFor(
    kind: 'title' | 'story' | 'share',
    de: boolean,
    seed: string,
  ): string[] {
    if (kind === 'title') {
      return de
        ? [
            'Mein Weg zum MBA - hilf mir, die Lücke zu schließen',
            'Vom Traum zur Zulassung - jetzt fehlt nur die Finanzierung',
            'Bildung, die ich zurückgebe - unterstütze meinen MBA',
            'Ein Platz, ein Ziel, ein letzter Schritt zur Finanzierung',
          ]
        : [
            'My path to the MBA - help me close the gap',
            'Admitted and ready - the tuition is the last hurdle',
            'Invest in a future I will bring back home',
            'One seat, one goal, one final funding step',
          ];
    }
    if (kind === 'story') {
      const para1de =
        'Ich komme aus einer Familie, in der Bildung alles bedeutet, und habe mir meinen Weg Schritt für Schritt erarbeitet. ';
      const para2de =
        'Die Zulassung habe ich - doch die Studiengebühren übersteigen meine Ersparnisse bei Weitem, und genau hier brauche ich deine Unterstützung. ';
      const para3de =
        'Mit diesem Abschluss bringe ich mein Wissen zurück in meine Region und helfe der nächsten Generation, denselben Weg zu gehen.';
      const para1en =
        'I come from a family where education means everything, and I built my path one step at a time. ';
      const para2en =
        'I have the admission - but the tuition is far beyond my savings, and this is exactly where I need your support. ';
      const para3en =
        'With this degree I will bring my skills back to my region and help the next generation walk the same path.';
      return de
        ? [para1de + '\n\n' + para2de + '\n\n' + para3de]
        : [para1en + '\n\n' + para2en + '\n\n' + para3en];
    }
    // share
    const isWhatsApp = /WhatsApp|sehr kurz|very short/i.test(seed);
    const isEmail = /Betreff|subject line|E-Mail|Email/i.test(seed);
    if (isWhatsApp) {
      return de
        ? [
            'Hey! Ich sammle für meinen MBA - jeder Beitrag hilft. Schau mal auf meine Kampagne 🙏',
            'Kurze Bitte: Ich finanziere mein Studium über Bursa. Würdest du meine Kampagne teilen?',
          ]
        : [
            'Hey! I am raising tuition for my MBA - every bit helps. Take a look at my campaign 🙏',
            'Quick ask: I am funding my degree via Bursa. Could you share my campaign?',
          ];
    }
    if (isEmail) {
      return de
        ? [
            'Betreff: Hilf mir, meinen MBA zu finanzieren\n\nHallo, ich wurde zum MBA zugelassen, doch die Gebühren übersteigen meine Mittel. Über Bursa geht jede Spende direkt an die Hochschule. Schau dir meine Kampagne an - danke für deine Unterstützung.',
          ]
        : [
            'Subject: Help me fund my MBA\n\nHi, I was admitted to the MBA but the tuition is beyond my means. On Bursa every gift goes straight to the school. Please take a look at my campaign - thank you for your support.',
          ];
    }
    return de
      ? [
          'Ich habe es geschafft: zugelassen zum MBA. Jetzt fehlt nur die Finanzierung - und über Bursa geht jeder Beitrag direkt an die Hochschule. Wer mich unterstützen möchte, findet hier meine Kampagne. #MBA #Bildung',
          'Eine Zulassung ist ein Anfang, keine Garantie. Ich finanziere mein Studium über Bursa, wo Spenden direkt an die Hochschule fließen. Teile gern meine Kampagne. #MBA #Stipendium',
        ]
      : [
          'I made it: admitted to the MBA. The last hurdle is funding - and on Bursa every gift goes straight to the school. If you would like to support me, my campaign is linked here. #MBA #Education',
          'An admission is a start, not a guarantee. I am funding my degree via Bursa, where gifts go directly to the school. Please share my campaign. #MBA #Scholarship',
        ];
  }
}
