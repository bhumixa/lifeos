import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Renders a small, safe subset of markdown (bold/italic/bullet lists) for the preview pane —
 * HTML-escapes the raw text first, so no user-authored journal content can inject markup; Angular's
 * own [innerHTML] sanitizer is a second layer of defense on top of that. */
function renderMarkdownLite(text: string): string {
  const withInline = escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');

  const html: string[] = [];
  let inList = false;
  for (const line of withInline.split('\n')) {
    if (/^-\s+/.test(line)) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${line.replace(/^-\s+/, '')}</li>`);
    } else {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
      if (line.trim()) {
        html.push(`<p>${line}</p>`);
      }
    }
  }
  if (inList) {
    html.push('</ul>');
  }
  return html.join('');
}

/** A lightweight markdown-lite editor for an entry's free-text fields — a toolbar wraps the
 * current selection in `**bold**`/`*italic*` syntax or inserts a "- " list item, and a Preview
 * toggle renders that subset back as HTML. No third-party rich-text dependency (ngx-quill/
 * CKEditor aren't installed anywhere in this codebase, and CLAUDE.md weighs against adding one
 * without justification) — a markdown textarea covers the milestone's "Rich Text Editor (or
 * markdown editor if preferred)" ask without one. */
@Component({
  selector: 'app-rich-text-editor',
  imports: [FormsModule, MatButtonModule, MatIconModule],
  templateUrl: './rich-text-editor.html',
  styleUrl: './rich-text-editor.scss',
})
export class RichTextEditor {
  readonly value = input('');
  readonly placeholder = input('Write freely…');
  readonly disabled = input(false);
  readonly valueChange = output<string>();

  protected readonly previewMode = signal(false);
  protected readonly previewHtml = computed(() => renderMarkdownLite(this.value()));

  protected onInput(value: string): void {
    this.valueChange.emit(value);
  }

  protected wrapSelection(textarea: HTMLTextAreaElement, marker: string): void {
    const { selectionStart, selectionEnd, value } = textarea;
    const selected = value.slice(selectionStart, selectionEnd);
    const next = `${value.slice(0, selectionStart)}${marker}${selected}${marker}${value.slice(selectionEnd)}`;
    this.valueChange.emit(next);
  }

  protected insertListItem(textarea: HTMLTextAreaElement): void {
    const { selectionStart, value } = textarea;
    const needsNewline = selectionStart > 0 && value[selectionStart - 1] !== '\n';
    const next = `${value.slice(0, selectionStart)}${needsNewline ? '\n' : ''}- ${value.slice(selectionStart)}`;
    this.valueChange.emit(next);
  }

  protected togglePreview(): void {
    this.previewMode.set(!this.previewMode());
  }
}
