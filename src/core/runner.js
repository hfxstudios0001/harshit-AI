export class Runner {
  constructor() {
    this.worker = null;
    this.timer = null;
    this.listener = null;
    this.frame = null;
    this.finish = null;
  }
  cancel() {
    this.worker?.terminate();
    this.worker = null;
    clearTimeout(this.timer);
    if (this.listener) window.removeEventListener("message", this.listener);
    this.listener = null;
    if (this.finish) {
      const finish = this.finish;
      this.finish = null;
      finish({
        ok: false,
        cancelled: true,
        error: "Stopped. Your code is saved.",
        tests: [],
        output: "",
      });
    }
  }
  run(
    challenge,
    code,
    { test = false, onStatus = () => {}, preview = null } = {},
  ) {
    this.cancel();
    return new Promise((resolve) => {
      const finish = (result) => {
        if (!this.finish) return;
        this.finish = null;
        this.worker?.terminate();
        this.worker = null;
        clearTimeout(this.timer);
        if (this.listener) window.removeEventListener("message", this.listener);
        this.listener = null;
        resolve(result);
      };
      this.finish = resolve;
      this.timer = setTimeout(
        () =>
          finish({
            ok: false,
            error:
              "Stopped after 45 seconds. Check for an infinite loop. A first Python download may also need a retry on a slow connection.",
            tests: [],
            output: "",
          }),
        45000,
      );
      if (challenge.language === "html") {
        if (!preview) {
          finish({
            ok: false,
            error: "Preview container is unavailable.",
            tests: [],
            output: "",
          });
          return;
        }
        const frame = document.createElement("iframe");
        frame.title = "Your isolated webpage";
        frame.setAttribute("sandbox", "allow-scripts");
        frame.referrerPolicy = "no-referrer";
        const nonce = crypto.randomUUID();
        this.frame = frame;
        this.listener = (event) => {
          if (
            event.source !== frame.contentWindow ||
            event.data?.nonce !== nonce
          )
            return;
          if (event.data.type === "result") finish(event.data.result);
        };
        window.addEventListener("message", this.listener);
        const tests = test ? challenge.tests || [] : [];
        // Execute checks after the learner document has loaded, inside its opaque-origin sandbox.
        const script = `window.addEventListener('load',()=>{const results=[];${tests.map((t) => `try{const passed=Boolean(${t.expression});results.push({name:${JSON.stringify(t.name)},passed,detail:passed?'Passed':'The page did not meet this interaction requirement.'});}catch(e){results.push({name:${JSON.stringify(t.name)},passed:false,detail:String(e.message||e)});}`).join("")}parent.postMessage({nonce:${JSON.stringify(nonce)},type:'result',result:{ok:true,tests:results,output:'Preview ready. Interact with the page below.'}},'*');});`;
        frame.srcdoc = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; form-action 'none';">${code}<script>${script.replace(/<\/script/gi, "<\\/script")}</script>`;
        preview.replaceChildren(frame);
        onStatus("Building your isolated webpage…");
        return;
      }
      try {
        const file =
          challenge.language === "python"
            ? "python-worker.js"
            : challenge.language === "sql"
              ? "sql-worker.js"
              : "javascript-worker.js";
        this.worker = new Worker(new URL(file, document.baseURI), {
          type: challenge.language === "sql" ? "classic" : "module",
        });
        this.worker.onmessage = ({ data }) => {
          if (data.type === "status") onStatus(data.message);
          if (data.type === "result") finish(data.result);
        };
        this.worker.onerror = () =>
          finish({
            ok: false,
            error:
              "The runtime could not load. Check your connection and retry. Your code is preserved.",
            tests: [],
            output: "",
          });
        this.worker.postMessage({
          code,
          tests: test ? challenge.tests || [] : [],
          schema: challenge.schema || "",
        });
        onStatus("Starting " + challenge.language + "…");
      } catch (error) {
        finish({
          ok: false,
          error: String(error.message || error),
          tests: [],
          output: "",
        });
      }
    });
  }
}
