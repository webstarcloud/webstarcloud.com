import { Component } from '@angular/core';
import { WRITING_ITEMS, WritingItem } from '../content/writing';

@Component({
  selector: 'app-writing',
  templateUrl: './writing.component.html',
  styleUrls: ['./writing.component.css']
})
export class WritingComponent {
  readonly writingItems: WritingItem[] = WRITING_ITEMS;

  get publishedItems(): WritingItem[] {
    return this.writingItems.filter((item) => item.status === 'published');
  }

  get draftItems(): WritingItem[] {
    return this.writingItems.filter((item) => item.status === 'draft');
  }
}
