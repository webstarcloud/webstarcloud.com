import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-artifact-viewer',
  templateUrl: './artifact-viewer.component.html',
  styleUrls: ['./artifact-viewer.component.css']
})
export class ArtifactViewerComponent {
  @Input() responseMarkdown = '';

  get hasContent() {
    return Boolean(this.responseMarkdown.trim());
  }

  get responseHtml() {
    return this.toHtml(this.responseMarkdown);
  }

  private toHtml(markdown: string) {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const htmlParts: string[] = [];
    let paragraphBuffer: string[] = [];
    let listBuffer: string[] = [];
    let codeBuffer: string[] = [];
    let inCodeBlock = false;

    const flushParagraph = () => {
      if (!paragraphBuffer.length) {
        return;
      }

      htmlParts.push(`<p>${this.inlineMarkdown(paragraphBuffer.join(' '))}</p>`);
      paragraphBuffer = [];
    };

    const flushList = () => {
      if (!listBuffer.length) {
        return;
      }

      htmlParts.push(`<ul>${listBuffer.map((item) => `<li>${this.inlineMarkdown(item)}</li>`).join('')}</ul>`);
      listBuffer = [];
    };

    const flushCode = () => {
      if (!codeBuffer.length) {
        return;
      }

      htmlParts.push(`<pre><code>${this.escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
      codeBuffer = [];
    };

    lines.forEach((line) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('```')) {
        flushParagraph();
        flushList();
        if (inCodeBlock) {
          flushCode();
        }
        inCodeBlock = !inCodeBlock;
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      if (!trimmed) {
        flushParagraph();
        flushList();
        return;
      }

      const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
      if (headingMatch) {
        flushParagraph();
        flushList();
        const level = Math.min(headingMatch[1].length + 1, 5);
        htmlParts.push(`<h${level}>${this.inlineMarkdown(headingMatch[2])}</h${level}>`);
        return;
      }

      const listMatch = trimmed.match(/^(?:-|\*|•|\d+\.)\s+(.*)$/);
      if (listMatch) {
        flushParagraph();
        listBuffer.push(listMatch[1]);
        return;
      }

      paragraphBuffer.push(trimmed);
    });

    flushParagraph();
    flushList();
    flushCode();

    return htmlParts.join('');
  }

  private inlineMarkdown(text: string) {
    return this.escapeHtml(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  private escapeHtml(text: string) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
