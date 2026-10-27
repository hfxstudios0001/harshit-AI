// Optimistic concurrency: never replace a cloud version the client has not seen.
export class SyncCoordinator {
  constructor({ service, getState, setState, onStatus = () => {} }) {
    Object.assign(this, { service, getState, setState, onStatus });
    this.revision = 0;
    this.ready = false;
    this.conflict = null;
    this.timer = null;
    this.saving = false;
    this.generation = 0;
    this.disposed = false;
  }
  async load() {
    this.onStatus("loading");
    try {
      const row = await this.service.load();
      if (this.disposed) return;
      this.revision = row?.revision || 0;
      const local = this.getState();
      if (
        row &&
        local.updatedAt > 0 &&
        JSON.stringify(local) !== JSON.stringify(row.progress)
      ) {
        this.conflict = { local: structuredClone(local), remote: row };
        this.ready = true;
        this.onStatus("conflict");
        return;
      }
      if (row) this.setState(row.progress);
      this.ready = true;
      this.onStatus("synced");
      if (!row && local.updatedAt > 0) await this.flush();
    } catch (error) {
      if (!this.disposed) this.onStatus("error", error.message);
    }
  }

  changed() {
    this.generation++;
    if (this.disposed) return;
    clearTimeout(this.timer);
    this.onStatus(this.conflict ? "conflict" : "pending");
    if (this.ready && !this.conflict)
      this.timer = setTimeout(() => this.flush(), 900);
  }
  async flush() {
    if (!this.ready || this.conflict || this.saving || this.disposed) return;
    this.saving = true;
    const generation = this.generation;
    const snapshot = structuredClone(this.getState());
    this.onStatus("saving");
    try {
      const row = await this.service.save(snapshot, this.revision);
      if (this.disposed) return;
      this.revision = row.revision;
      this.onStatus("synced");
    } catch (error) {
      if (this.disposed) return;
      if (error.code === "conflict") {
        try {
          this.conflict = {
            local: structuredClone(this.getState()),
            remote: await this.service.load(),
          };
          this.onStatus("conflict");
        } catch (loadError) {
          this.ready = false;
          this.onStatus("error", loadError.message);
        }
      } else this.onStatus("error", error.message);
    } finally {
      this.saving = false;
      if (!this.disposed && this.generation !== generation && !this.conflict)
        this.changed();
    }
  }
  async resolve(choice) {
    if (!this.conflict) return;
    const remote = this.conflict.remote;
    this.revision = remote?.revision || 0;
    if (choice === "cloud") {
      if (remote) this.setState(remote.progress);
      this.conflict = null;
      this.onStatus("synced");
    } else if (choice === "device") {
      this.conflict = null;
      await this.flush();
    }
  }
  dispose() {
    this.disposed = true;
    clearTimeout(this.timer);
  }
}
