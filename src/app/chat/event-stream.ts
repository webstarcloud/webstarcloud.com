/** Incremental SSE parser. Network chunks are not necessarily events or tokens. */
export class EventStreamParser {
  private buffer = '';
  push(text: string): Array<{ event: string; data: unknown }> {
    this.buffer += text;
    if (this.buffer.length > 1_048_576) throw new Error('The model sent an oversized event.');
    const frames: Array<{ event: string; data: unknown }> = [];
    let separator: RegExpExecArray | null;
    while ((separator = /\r?\n\r?\n/.exec(this.buffer))) {
      const frame = this.buffer.slice(0, separator.index);
      this.buffer = this.buffer.slice(separator.index + separator[0].length);
      const lines = frame.split(/\r?\n/);
      const event =
        lines
          .find((line) => line.startsWith('event:'))
          ?.slice(6)
          .trim() || 'message';
      const data = lines
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');
      if (data) {
        try {
          frames.push({ event, data: JSON.parse(data) });
        } catch {
          throw new Error('The chat service returned an invalid event.');
        }
      }
    }
    return frames;
  }
}
