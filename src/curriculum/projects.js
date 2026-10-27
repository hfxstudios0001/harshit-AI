import { sessionSchema } from "./advanced.js";
export const projects = [
  {
    id: "project-study-report",
    title: "A tested study analytics engine",
    subtitle: "Turn raw sessions into a reliable report.",
    language: "python",
    modules: ["python-functions", "python-projects"],
    hours: "2–4",
    brief:
      "Build the calculation layer for a learning dashboard. Your function should work independently of a UI, reject invalid data, and preserve its inputs. The first consumer is a command-line report; later, the same contract could serve an API.",
    requirements: [
      "Implement study_report(sessions, goal). Each session has topic (nonblank string) and minutes (nonnegative integer; booleans are invalid).",
      "Reject invalid sessions or a negative/noninteger goal with ValueError.",
      "Return total, remaining clamped to zero, and by_topic totals. Do not mutate inputs.",
      "Document the contract, explain validation choices, and describe the empty-input behavior.",
    ],
    rubric: [
      "I can explain every branch of my solution.",
      "I tested invalid inputs and empty data.",
      "I documented the inputs, outputs, and limitations.",
    ],
    challenge: {
      language: "python",
      prompt:
        "Implement study_report(sessions, goal) following the project requirements.",
      starter:
        "def study_report(sessions, goal):\n    # Validate, aggregate, and return the report.\n    pass",
      solution:
        'def study_report(sessions, goal):\n    if type(goal) is not int or goal < 0:\n        raise ValueError("Invalid goal")\n    by_topic = {}\n    total = 0\n    for session in sessions:\n        topic, minutes = session.get("topic"), session.get("minutes")\n        if not isinstance(topic, str) or not topic.strip() or type(minutes) is not int or minutes < 0:\n            raise ValueError("Invalid session")\n        total += minutes\n        by_topic[topic] = by_topic.get(topic, 0) + minutes\n    return {"total":total,"remaining":max(0,goal-total),"by_topic":by_topic}',
      tests: [
        {
          name: "Aggregates repeated topics",
          expression:
            'study_report([{"topic":"Python","minutes":20},{"topic":"Git","minutes":10},{"topic":"Python","minutes":15}],60) == {"total":45,"remaining":15,"by_topic":{"Python":35,"Git":10}}',
        },
        {
          name: "Empty report",
          expression:
            'study_report([],20) == {"total":0,"remaining":20,"by_topic":{}}',
        },
        {
          name: "Exceeded goal",
          expression:
            'study_report([{"topic":"Git","minutes":30}],20)["remaining"] == 0',
        },
        {
          name: "Reject negative session",
          expression:
            '_raises(ValueError,study_report,[{"topic":"Git","minutes":-1}],20)',
        },
        {
          name: "Reject booleans",
          expression:
            '_raises(ValueError,study_report,[{"topic":"Git","minutes":True}],20)',
        },
        {
          name: "Reject blank topic",
          expression:
            '_raises(ValueError,study_report,[{"topic":" ","minutes":1}],20)',
        },
        {
          name: "Reject invalid goal",
          expression: "_raises(ValueError,study_report,[],-1)",
        },
        {
          name: "Preserve inputs",
          expression:
            '_unchanged(study_report,[{"topic":"Git","minutes":10}],20)',
        },
      ],
      hints: [
        "Validate before updating totals. Python bool is an int subclass, so use type(value) is int for this contract.",
        "Keep a total accumulator and a dictionary of per-topic totals. Return max(0, goal-total) for remaining.",
      ],
    },
  },
  {
    id: "project-task-service",
    title: "A permission-aware task service",
    subtitle: "Practice API contracts, validation, and ownership.",
    language: "javascript",
    modules: ["javascript", "backend"],
    hours: "3–5",
    brief:
      "Build a pure request handler for a task service. It accepts a trusted session and returns an HTTP-shaped response. This is the tested business layer, not a live server: document how you would integrate it with verified authentication and durable storage.",
    requirements: [
      "Implement createTask(session, payload, nextId). session.userId must be a nonempty string or return {status:401}.",
      "Require payload.title as a string whose trimmed length is 1–80; otherwise return {status:400}.",
      "Return {status:201,body:{id:nextId,ownerId:session.userId,title:trimmedTitle,done:false}}.",
      "Ignore any client-supplied ownerId and avoid mutating inputs.",
    ],
    rubric: [
      "I separated trusted identity from untrusted payload data.",
      "I documented missing authentication and invalid-input responses.",
      "I explained which guarantees still require a real server and database.",
    ],
    challenge: {
      language: "javascript",
      prompt:
        "Implement createTask(session, payload, nextId) using the project contract.",
      starter:
        "function createTask(session, payload, nextId) {\n  // Authenticate, validate, construct the response.\n}",
      solution:
        'function createTask(session, payload, nextId) {\n  if (typeof session?.userId !== "string" || !session.userId) return {status:401};\n  if (typeof payload?.title !== "string" || !payload.title.trim() || payload.title.trim().length > 80) return {status:400};\n  return {status:201,body:{id:nextId,ownerId:session.userId,title:payload.title.trim(),done:false}};\n}',
      tests: [
        {
          name: "Create a task",
          expression:
            'JSON.stringify(createTask({userId:"alice"},{title:" Study "},"t1"))===JSON.stringify({status:201,body:{id:"t1",ownerId:"alice",title:"Study",done:false}})',
        },
        {
          name: "Require identity",
          expression: 'createTask(null,{title:"Study"},"t1").status===401',
        },
        {
          name: "Reject blank title",
          expression: 'createTask({userId:"a"},{title:" "},"t1").status===400',
        },
        {
          name: "Reject long title",
          expression:
            'createTask({userId:"a"},{title:"x".repeat(81)},"t1").status===400',
        },
        {
          name: "Prevent owner spoofing",
          expression:
            'createTask({userId:"alice"},{title:"Study",ownerId:"bob"},"t1").body.ownerId==="alice"',
        },
        {
          name: "Handle missing payload",
          expression: 'createTask({userId:"a"},null,"t1").status===400',
        },
        {
          name: "Preserve payload",
          expression:
            '(()=>{const p={title:" Study "};createTask({userId:"a"},p,"t1");return p.title===" Study ";})()',
        },
      ],
      hints: [
        "Authenticate first so a missing identity returns 401 regardless of payload.",
        "Build the output fields explicitly; never spread the untrusted payload into the saved task.",
      ],
    },
  },
  {
    id: "project-sql-dashboard",
    title: "A database-backed learning report",
    subtitle: "Query a complete roster, including learners with no activity.",
    language: "sql",
    modules: ["sql"],
    hours: "2–4",
    brief:
      "Build the query powering a learning dashboard. Every learner must remain visible, even when they have no sessions. Correct aggregation matters more than attractive numbers. Explain why your join and count choices do not inflate progress.",
    requirements: [
      "Return name, total_minutes, and session_count for every learner.",
      "Use zero totals for learners with no sessions.",
      "Sort total_minutes descending, then name ascending.",
      "Explain the LEFT JOIN and how nulls affect COUNT and SUM.",
    ],
    rubric: [
      "I can explain why inactive learners appear.",
      "I checked that totals are not multiplied by joins.",
      "I documented the ordering and null behavior.",
    ],
    challenge: {
      language: "sql",
      prompt: "Write the learner activity report query.",
      schema:
        "CREATE TABLE learners(id INTEGER PRIMARY KEY,name TEXT); CREATE TABLE sessions(id INTEGER PRIMARY KEY,learner_id INTEGER,minutes INTEGER); INSERT INTO learners VALUES(1,'Alex'),(2,'Sam'),(3,'Riya'); INSERT INTO sessions VALUES(1,1,20),(2,1,30),(3,2,15);",
      starter: "SELECT name FROM learners;",
      solution:
        "SELECT l.name, COALESCE(SUM(s.minutes),0) AS total_minutes, COUNT(s.id) AS session_count FROM learners l LEFT JOIN sessions s ON s.learner_id=l.id GROUP BY l.id,l.name ORDER BY total_minutes DESC,l.name ASC;",
      tests: [
        {
          name: "Complete and accurate learner report",
          columns: ["name", "total_minutes", "session_count"],
          expected: [
            ["Alex", 50, 2],
            ["Sam", 15, 1],
            ["Riya", 0, 0],
          ],
        },
      ],
      hints: [
        "Start with learners and LEFT JOIN sessions.",
        "Use COALESCE(SUM(...),0) and COUNT(s.id), then group by learner.",
      ],
    },
  },
  {
    id: "project-retrieval",
    title: "A measurable document retriever",
    subtitle: "Rank documents with a clear, testable baseline.",
    language: "python",
    modules: ["algorithms", "data-ai"],
    hours: "4–6",
    brief:
      "Implement a transparent keyword-retrieval baseline before adding embeddings or a language model. Tokenize by whitespace, lowercase words, and rank by the count of unique query terms present in each document. Document the limitations: punctuation, synonyms, multilingual text, and semantic relevance are not handled.",
    requirements: [
      "Implement retrieve(documents, query, k). Documents contain id and text.",
      "Score each document by unique lowercase whitespace-separated query terms found in it. Exclude zero-score documents.",
      "Return document IDs sorted by score descending, then ID ascending, limited to k. k <= 0 returns [].",
      "Keep inputs unchanged. Write a small evaluation set and explain how recall@k would be measured.",
    ],
    rubric: [
      "I described the exact tokenization and ranking contract.",
      "I evaluated queries with no results and repeated terms.",
      "I explained where keyword matching fails compared with semantic retrieval.",
    ],
    challenge: {
      language: "python",
      prompt: "Implement retrieve(documents, query, k).",
      starter: "def retrieve(documents, query, k):\n    pass",
      solution:
        'def retrieve(documents, query, k):\n    if k <= 0:\n        return []\n    terms = set(query.lower().split())\n    ranked = []\n    for doc in documents:\n        score = len(terms & set(doc["text"].lower().split()))\n        if score:\n            ranked.append((-score, doc["id"]))\n    ranked.sort()\n    return [doc_id for _,doc_id in ranked[:k]]',
      tests: [
        {
          name: "Rank by matched terms",
          expression:
            'retrieve([{"id":"a","text":"Python loops"},{"id":"b","text":"Python"}],"python loops",2) == ["a","b"]',
        },
        {
          name: "Case-insensitive",
          expression:
            'retrieve([{"id":"a","text":"PYTHON"}],"python",1) == ["a"]',
        },
        {
          name: "Stable tie break",
          expression:
            'retrieve([{"id":"b","text":"code"},{"id":"a","text":"code"}],"code",2) == ["a","b"]',
        },
        {
          name: "Duplicate terms do not inflate",
          expression:
            'retrieve([{"id":"a","text":"code"},{"id":"b","text":"code loops"}],"code code loops",1) == ["b"]',
        },
        {
          name: "Exclude no-match",
          expression: 'retrieve([{"id":"a","text":"Python"}],"sql",2) == []',
        },
        {
          name: "Respect limit",
          expression: 'retrieve([{"id":"a","text":"code"}],"code",0) == []',
        },
      ],
      hints: [
        "Use sets for unique query terms and document words.",
        "Store (-score, id) pairs and sort them to get descending scores with ascending ID ties.",
      ],
    },
  },
  {
    id: "project-event-processor",
    title: "A repeat-safe event processor",
    subtitle: "Apply retries and ownership rules to one reliable workflow.",
    language: "python",
    modules: ["backend", "systems"],
    hours: "4–6",
    brief:
      "Process study events that may be delivered repeatedly. You need repeat-safe aggregation and a clear response to conflicting copies of an event. This is an in-memory model: describe which operations would need an atomic database transaction in production.",
    requirements: [
      "Implement process_events(events). Each event has id, learner, and nonnegative integer minutes (not bool).",
      "Accept the first valid copy of each id. Ignore identical repeats. Raise ValueError when a repeated id has different learner or minutes.",
      "Return per-learner minute totals. Reject invalid minutes with ValueError.",
      "Do not mutate events. Document durable storage and acknowledgment requirements.",
    ],
    rubric: [
      "I distinguished exact retries from conflicting duplicate IDs.",
      "I tested invalid data and empty input.",
      "I explained why in-memory deduplication alone is not production durability.",
    ],
    challenge: {
      language: "python",
      prompt:
        "Implement process_events(events) according to the delivery contract.",
      starter: "def process_events(events):\n    pass",
      solution:
        'def process_events(events):\n    seen, totals = {}, {}\n    for event in events:\n        minutes = event["minutes"]\n        if type(minutes) is not int or minutes < 0:\n            raise ValueError("Invalid minutes")\n        payload = (event["learner"], minutes)\n        if event["id"] in seen:\n            if seen[event["id"]] != payload:\n                raise ValueError("Conflicting duplicate")\n            continue\n        seen[event["id"]] = payload\n        totals[event["learner"]] = totals.get(event["learner"],0) + minutes\n    return totals',
      tests: [
        {
          name: "Aggregate learner events",
          expression:
            'process_events([{"id":"a","learner":"u","minutes":20},{"id":"b","learner":"u","minutes":10}]) == {"u":30}',
        },
        {
          name: "Ignore exact retries",
          expression:
            'process_events([{"id":"a","learner":"u","minutes":20}]*3) == {"u":20}',
        },
        {
          name: "Reject conflicting repeats",
          expression:
            '_raises(ValueError,process_events,[{"id":"a","learner":"u","minutes":20},{"id":"a","learner":"u","minutes":30}])',
        },
        {
          name: "Reject negative",
          expression:
            '_raises(ValueError,process_events,[{"id":"a","learner":"u","minutes":-1}])',
        },
        { name: "Empty input", expression: "process_events([]) == {}" },
        {
          name: "Independent learners",
          expression:
            'process_events([{"id":"a","learner":"u","minutes":20},{"id":"b","learner":"v","minutes":10}]) == {"u":20,"v":10}',
        },
      ],
      hints: [
        "Remember the complete identifying payload for each event ID.",
        "Only add to totals after validating and confirming the ID is new.",
      ],
    },
  },
  {
    id: "project-web-tracker",
    title: "An interactive learning journal",
    subtitle: "Build an accessible interface with real interactions.",
    language: "html",
    modules: ["web", "javascript"],
    hours: "4–8",
    brief:
      "Build a one-page study journal. A learner enters a topic and duration, saves a session, and sees the total update. Use semantic labels and textContent for user-entered text. The assessment tests the core interactions; the visual and usability review is yours to perform.",
    requirements: [
      "Create a form with ID session-form, inputs topic and minutes with associated labels, an element total initially showing 0, and a list sessions.",
      "Prevent default form submission. Reject a blank topic or nonpositive/noninteger duration without changing the list or total.",
      "For a valid entry, append a list item containing the topic and duration; update total.",
      "Treat entered text as text, not HTML. Include a heading and keyboard-operable controls.",
    ],
    rubric: [
      "I tested the page using only the keyboard.",
      "I reviewed the mobile layout and readable contrast.",
      "I verified that entered HTML is displayed as text, not executed.",
    ],
    challenge: {
      language: "html",
      prompt:
        "Build the complete journal page using HTML, CSS, and JavaScript.",
      starter:
        '<h1>Study journal</h1>\n<form id="session-form">\n  <!-- Add labeled inputs and a submit button -->\n</form>\n<p>Total: <span id="total">0</span> minutes</p>\n<ul id="sessions"></ul>\n<script>\n// Add your application logic\n</script>',
      solution:
        '<h1>Study journal</h1><form id="session-form"><label for="topic">Topic</label><input id="topic"><label for="minutes">Minutes</label><input id="minutes" type="number"><button type="submit">Save session</button></form><p>Total: <span id="total">0</span> minutes</p><ul id="sessions"></ul><script>let total=0;document.querySelector("#session-form").addEventListener("submit",event=>{event.preventDefault();const topic=document.querySelector("#topic").value.trim();const minutes=Number(document.querySelector("#minutes").value);if(!topic||!Number.isInteger(minutes)||minutes<=0)return;const item=document.createElement("li");item.textContent=topic+" — "+minutes+" minutes";document.querySelector("#sessions").append(item);total+=minutes;document.querySelector("#total").textContent=String(total);});</script>',
      tests: [
        {
          name: "Inputs have labels",
          expression:
            '!!document.querySelector("label[for=topic]") && !!document.querySelector("label[for=minutes]")',
        },
        {
          name: "Save a valid session",
          expression:
            '(()=>{document.querySelector("#topic").value="Python";document.querySelector("#minutes").value="25";document.querySelector("#session-form").dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));return document.querySelector("#total").textContent.trim()==="25" && document.querySelector("#sessions li").textContent.includes("Python")})()',
        },
        {
          name: "Reject invalid duration",
          expression:
            '(()=>{document.querySelector("#minutes").value="-1";document.querySelector("#session-form").dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));return document.querySelectorAll("#sessions li").length===1 && document.querySelector("#total").textContent.trim()==="25"})()',
        },
        {
          name: "Render input as text",
          expression:
            '(()=>{document.querySelector("#topic").value="<b>Git</b>";document.querySelector("#minutes").value="10";document.querySelector("#session-form").dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));return !document.querySelector("#sessions b") && document.querySelector("#sessions").textContent.includes("<b>Git</b>") && document.querySelector("#total").textContent.trim()==="35"})()',
        },
      ],
      hints: [
        "Listen to submit on the form and call preventDefault.",
        "Create li elements and assign textContent instead of interpolating user input into innerHTML.",
      ],
    },
  },
];
export const projectById = Object.fromEntries(projects.map((p) => [p.id, p]));
