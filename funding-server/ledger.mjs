import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/** One campaign per database. Store references and totals, never payment payloads or donor details. */
export class Ledger {
  constructor(filename, campaign) {
    this.campaign = campaign;
    if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS campaign (id TEXT PRIMARY KEY, currency TEXT NOT NULL, target INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS inbox (id TEXT PRIMARY KEY, kind TEXT NOT NULL, reference TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS contributions (session TEXT PRIMARY KEY, amount INTEGER NOT NULL CHECK(amount >= 0));
      CREATE TABLE IF NOT EXISTS launch (id TEXT PRIMARY KEY, status TEXT NOT NULL, spec TEXT NOT NULL);
    `);
    const existing = this.db.prepare('SELECT * FROM campaign').get();
    if (existing && (existing.id !== campaign.id || existing.currency !== campaign.currency || existing.target !== campaign.targetMinor)) throw new Error('Campaign does not match this ledger; use a separate database for another goal');
    this.db.prepare('INSERT OR IGNORE INTO campaign VALUES (?, ?, ?)').run(campaign.id, campaign.currency, campaign.targetMinor);
  }
  receive(id, kind, reference) {
    this.db.prepare('INSERT OR IGNORE INTO inbox (id, kind, reference) VALUES (?, ?, ?)').run(id, kind, reference);
  }
  pending() { return this.db.prepare('SELECT * FROM inbox WHERE done = 0 ORDER BY rowid LIMIT 100').all(); }
  total() { return this.db.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM contributions').get().total; }
  job() { return this.db.prepare('SELECT * FROM launch WHERE id = ?').get(this.campaign.id); }
  completeEvent(eventId, contribution) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (contribution) {
        if (!Number.isSafeInteger(contribution.amount) || contribution.amount < 0) throw new Error('Invalid contribution amount');
        this.db.prepare('INSERT INTO contributions VALUES (?, ?) ON CONFLICT(session) DO UPDATE SET amount = excluded.amount').run(contribution.session, contribution.amount);
      }
      this.db.prepare('UPDATE inbox SET done = 1 WHERE id = ?').run(eventId);
      if (this.total() < this.campaign.targetMinor) {
        this.db.prepare("UPDATE launch SET status = 'held' WHERE status IN ('pending', 'held')").run();
      }
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  ensureJob(spec) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (this.total() >= this.campaign.targetMinor) {
        this.db.prepare("INSERT OR IGNORE INTO launch VALUES (?, 'pending', ?)").run(this.campaign.id, JSON.stringify(spec));
        this.db.prepare("UPDATE launch SET status = 'pending' WHERE id = ? AND status = 'held'").run(this.campaign.id);
      }
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  setStatus(status) {
    if (!['queued', 'running', 'completed', 'failed'].includes(status)) throw new Error('Invalid run receipt');
    this.db.prepare('UPDATE launch SET status = ? WHERE id = ?').run(status, this.campaign.id);
  }
  summary(config) {
    const receivedMinor = this.total();
    const job = this.job();
    const status = job?.status === 'failed' || job?.status === 'held' ? 'held' :
      ['queued', 'running', 'completed'].includes(job?.status) ? job.status :
      receivedMinor >= this.campaign.targetMinor ? 'funded' : 'collecting';
    return {
      campaignId: this.campaign.id, currency: this.campaign.currency, targetMinor: this.campaign.targetMinor,
      receivedMinor, status: config.enabled ? status : 'held', updatedAt: new Date().toISOString(),
      checkoutUrl: config.enabled && status === 'collecting' && !job ? config.paymentLinkUrl : null
    };
  }
  close() { this.db.close(); }
}
