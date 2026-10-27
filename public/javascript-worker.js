import { assessJavaScript } from "./assessment.js";
self.onmessage = async ({ data }) =>
  self.postMessage({
    type: "result",
    result: await assessJavaScript(data.code, data.tests || []),
  });
