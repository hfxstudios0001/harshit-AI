// Test expressions execute independently of learner code. Solutions are for feedback and curriculum validation.
const specs = [
  [
    "Say hello",
    "Display exactly Hello, learner! on one line.",
    'print("...")',
    'print("Hello, learner!")',
    [["Exact message", '_output.strip() == "Hello, learner!"']],
    [
      "Text goes inside quotation marks.",
      "Pass the complete message to print().",
    ],
  ],
  [
    "Store your study goal",
    "Create topic as the string Python and daily_minutes as the integer 25. Print topic.",
    'topic = ""\ndaily_minutes = 0',
    'topic = "Python"\ndaily_minutes = 25\nprint(topic)',
    [
      ["Topic value", 'topic == "Python"'],
      ["Numeric goal", "type(daily_minutes) is int and daily_minutes == 25"],
      ["Display the topic", '_output.strip() == "Python"'],
    ],
    [
      "Numbers should not have quotation marks.",
      "Assign each value before printing topic.",
    ],
  ],
  [
    "Plan a week",
    "Set daily_minutes to 25. Calculate weekly_minutes for seven days using daily_minutes, and print it.",
    "daily_minutes = 25\nweekly_minutes = 0",
    "daily_minutes = 25\nweekly_minutes = daily_minutes * 7\nprint(weekly_minutes)",
    [
      ["Daily goal", "daily_minutes == 25"],
      ["Weekly calculation", "weekly_minutes == 175"],
      ["Printed result", '_output.strip() == "175"'],
    ],
    [
      "Multiply a daily amount by the number of days.",
      "Use daily_minutes * 7, then print the result.",
    ],
  ],
  [
    "Decide if a goal is reached",
    "Set studied to 15 and goal to 20. Use an if/else to print Keep going if studied is below goal, otherwise Goal reached.",
    "studied = 15\ngoal = 20\n# Add your condition",
    'studied = 15\ngoal = 20\nif studied >= goal:\n    print("Goal reached")\nelse:\n    print("Keep going")',
    [
      ["Below-goal output", '_output.strip() == "Keep going"'],
      ["Inputs preserved", "studied == 15 and goal == 20"],
    ],
    [
      "Compare studied >= goal.",
      "The else branch handles the below-goal case.",
    ],
  ],
  [
    "Count seven days",
    "Use a for loop to print the numbers 1 through 7, one per line.",
    "for day in range(1, 2):\n    print(day)",
    "for day in range(1, 8):\n    print(day)",
    [["All seven days", "_output.split() == [str(i) for i in range(1, 8)]"]],
    [
      "range excludes the stopping number.",
      "The stop value must be one greater than 7.",
    ],
  ],
  [
    "Weekly tracker",
    "Set daily_minutes to 30 and calculate weekly_minutes for seven days. Print the weekly total, then Goal reached when the total is at least 200.",
    "daily_minutes = 30\n# Calculate and report your weekly progress",
    'daily_minutes = 30\nweekly_minutes = daily_minutes * 7\nprint(weekly_minutes)\nif weekly_minutes >= 200:\n    print("Goal reached")',
    [
      ["Correct total", "weekly_minutes == 210"],
      ["Report", '_output.splitlines() == ["210", "Goal reached"]'],
    ],
    [
      "Calculate the total before checking the goal.",
      "Print 210 via the variable, then use a comparison to choose the message.",
    ],
  ],
  [
    "Clean a username",
    'Starting with name = "  ALEX  ", create username by stripping surrounding whitespace and converting to lowercase. Keep name unchanged.',
    'name = "  ALEX  "\nusername = ""',
    'name = "  ALEX  "\nusername = name.strip().lower()',
    [
      ["Cleaned value", 'username == "alex"'],
      ["Original unchanged", 'name == "  ALEX  "'],
    ],
    [
      "String methods return a new string.",
      "Chain .strip().lower() and assign the result.",
    ],
  ],
  [
    "Convert a study duration",
    'Convert text_minutes = "30" into an integer minutes. Calculate weekly_minutes for seven days.',
    'text_minutes = "30"\n# Convert and calculate',
    'text_minutes = "30"\nminutes = int(text_minutes)\nweekly_minutes = minutes * 7',
    [
      ["Integer conversion", "type(minutes) is int and minutes == 30"],
      ["Weekly total", "weekly_minutes == 210"],
    ],
    [
      "Use int() before multiplication.",
      "Multiplying text repeats it; multiplying an integer calculates.",
    ],
  ],
  [
    "Organize your subjects",
    'Make topics start as ["Python", "Git", "Web"]. Append "SQL". Store the second item in second and the count in count.',
    'topics = ["Python", "Git", "Web"]\n# Append and inspect',
    'topics = ["Python", "Git", "Web"]\ntopics.append("SQL")\nsecond = topics[1]\ncount = len(topics)',
    [
      ["Final collection", 'topics == ["Python", "Git", "Web", "SQL"]'],
      ["Zero-based index", 'second == "Git"'],
      ["Item count", "count == 4"],
    ],
    [
      "The second item is at index 1.",
      "Use append and len for the update and count.",
    ],
  ],
  [
    "Total your sessions",
    "Using sessions = [15, 20, 30, 25], compute total with an accumulator and a loop.",
    "sessions = [15, 20, 30, 25]\ntotal = 0\n# Update total for each session",
    "sessions = [15, 20, 30, 25]\ntotal = 0\nfor minutes in sessions:\n    total += minutes",
    [
      ["Total includes every session", "total == 90"],
      ["Input preserved", "sessions == [15,20,30,25]"],
    ],
    [
      "Initialize total before the loop.",
      "Add each item to total instead of replacing total with the item.",
    ],
  ],
  [
    "Update a course record",
    'Create course with title "Python" and lesson_count 4. Change lesson_count to 5. Store missing = course.get("rating", 0).',
    'course = {"title": "Python", "lesson_count": 4}\n# Update the record',
    'course = {"title": "Python", "lesson_count": 4}\ncourse["lesson_count"] = 5\nmissing = course.get("rating", 0)',
    [
      ["Named properties", 'course == {"title":"Python","lesson_count":5}'],
      ["Missing-key fallback", "missing == 0"],
    ],
    [
      "Assign to a dictionary key with brackets.",
      "get accepts a default as its second argument.",
    ],
  ],
  [
    "A useful weekly report",
    "Use sessions = [20, 15, 30, 25] and goal = 100. Compute total and remaining. Remaining must not be negative. Print total then remaining on separate lines.",
    "sessions = [20, 15, 30, 25]\ngoal = 100\n# Calculate your report",
    "sessions = [20,15,30,25]\ngoal = 100\ntotal = 0\nfor minutes in sessions:\n    total += minutes\nremaining = goal - total\nif remaining < 0:\n    remaining = 0\nprint(total)\nprint(remaining)",
    [
      ["Total", "total == 90"],
      ["Remaining", "remaining == 10"],
      ["Output", '_output.splitlines() == ["90","10"]'],
    ],
    [
      "Start with the sum, then subtract it from the goal.",
      "Use a condition to clamp a negative remainder to zero.",
    ],
  ],
  [
    "Write a reusable greeting",
    "Define greet(name) that prints Hello, followed by a space and the provided name. Do not hard-code one person.",
    "def greet(name):\n    pass",
    'def greet(name):\n    print("Hello,", name)',
    [
      ["First person", '_capture(greet, "Alex").strip() == "Hello, Alex"'],
      ["Different person", '_capture(greet, "Sam").strip() == "Hello, Sam"'],
    ],
    [
      "Use the parameter inside print.",
      'print("Hello,", name) places a space between the values.',
    ],
  ],
  [
    "Return a doubled number",
    "Define double(number) that returns twice its argument. It must work for zero and negative numbers.",
    "def double(number):\n    pass",
    "def double(number):\n    return number * 2",
    [
      ["Positive", "double(7) == 14"],
      ["Zero", "double(0) == 0"],
      ["Negative", "double(-3) == -6"],
    ],
    [
      "A returned value can be used by a caller.",
      "Use return, not only print.",
    ],
  ],
  [
    "Fix a type mismatch",
    'The program should display 25. Fix the failing line without changing minutes from the string "20".',
    'minutes = "20"\nprint(minutes + 5)',
    'minutes = "20"\nprint(int(minutes) + 5)',
    [
      ["Value stays text", 'minutes == "20"'],
      ["Correct output", '_output.strip() == "25"'],
    ],
    [
      "The + operator needs compatible types.",
      "Convert minutes to int at the point of calculation.",
    ],
  ],
  [
    "Parse input safely",
    "Define parse_minutes(text) to return an integer for valid whole-number text and None for invalid text. Catch ValueError.",
    "def parse_minutes(text):\n    pass",
    "def parse_minutes(text):\n    try:\n        return int(text)\n    except ValueError:\n        return None",
    [
      ["Whole number", 'parse_minutes("20") == 20'],
      ["Zero", 'parse_minutes("0") == 0'],
      ["Invalid input", 'parse_minutes("twenty") is None'],
      ["Decimal rejected", 'parse_minutes("3.5") is None'],
    ],
    [
      "Put int(text) inside try.",
      "The except ValueError branch should return None.",
    ],
  ],
  [
    "Fix a function with tests",
    "weekly_total should multiply daily minutes by seven. Fix the implementation; retain and add assertions.",
    "def weekly_total(daily):\n    return daily * 6\n\nassert weekly_total(20) == 140",
    "def weekly_total(daily):\n    return daily * 7\n\nassert weekly_total(20) == 140\nassert weekly_total(0) == 0\nassert weekly_total(30) == 210",
    [
      ["Normal case", "weekly_total(20) == 140"],
      ["Zero case", "weekly_total(0) == 0"],
      ["Another input", "weekly_total(30) == 210"],
    ],
    [
      "The assertion tells you the expected contract.",
      "Fix the multiplication; do not weaken the expected value.",
    ],
  ],
  [
    "Goal calculator contract",
    "Define remaining(studied, goal). Return the missing minutes, or 0 when the goal is reached or exceeded. Inputs are nonnegative numbers.",
    "def remaining(studied, goal):\n    pass",
    "def remaining(studied, goal):\n    return max(0, goal - studied)",
    [
      ["Below goal", "remaining(30,100) == 70"],
      ["At goal", "remaining(100,100) == 0"],
      ["Over goal", "remaining(120,100) == 0"],
      ["No goal", "remaining(0,0) == 0"],
    ],
    [
      "Think about below, equal, and above cases separately.",
      "Return max(0, goal - studied).",
    ],
  ],
  [
    "Write and read a journal",
    "Write Python and Git on separate lines in journal.txt. Read the file into saved_text. Use with blocks.",
    'with open("journal.txt", "w") as file:\n    pass\n# Read your file',
    'with open("journal.txt", "w") as file:\n    file.write("Python\\nGit")\nwith open("journal.txt", "r") as file:\n    saved_text = file.read()',
    [
      [
        "File contents",
        'open("journal.txt").read().splitlines() == ["Python","Git"]',
      ],
      ["Readback", 'saved_text.splitlines() == ["Python","Git"]'],
    ],
    [
      "A newline is written as \\n inside a Python string.",
      "Use file.read() in the read block and store its return value.",
    ],
  ],
  [
    "Round-trip a learning record",
    'Set learner to {"name": "Alex", "topics": ["Python", "Git"]}. Serialize to text using json.dumps, then parse it into restored.',
    'import json\nlearner = {"name": "Alex", "topics": ["Python", "Git"]}\n# Serialize and restore',
    'import json\nlearner = {"name": "Alex", "topics": ["Python", "Git"]}\ntext = json.dumps(learner)\nrestored = json.loads(text)',
    [
      ["JSON text", "type(text) is str and json.loads(text) == learner"],
      ["Data restored", "restored == learner"],
      ["Nested values", 'restored["topics"][1] == "Git"'],
    ],
    [
      "dumps returns text; loads consumes text.",
      "Store the result of loads in restored.",
    ],
  ],
  [
    "Round up the sessions needed",
    "Define sessions_needed(minutes, session_length) using math.ceil. minutes is nonnegative; session_length is positive.",
    "import math\ndef sessions_needed(minutes, session_length):\n    pass",
    "import math\ndef sessions_needed(minutes, session_length):\n    return math.ceil(minutes / session_length)",
    [
      ["Partial session", "sessions_needed(180,25) == 8"],
      ["Exact division", "sessions_needed(100,25) == 4"],
      ["No work left", "sessions_needed(0,25) == 0"],
      ["Small remainder", "sessions_needed(1,25) == 1"],
    ],
    [
      "Divide the work by the session duration.",
      "ceil accounts for a partially needed final session.",
    ],
  ],
  [
    "Model an independent study goal",
    "Define StudyGoal with __init__(self, minutes) and reached(self, studied). Each instance must keep its own target.",
    "class StudyGoal:\n    def __init__(self, minutes):\n        pass\n\n    def reached(self, studied):\n        pass",
    "class StudyGoal:\n    def __init__(self, minutes):\n        self.minutes = minutes\n\n    def reached(self, studied):\n        return studied >= self.minutes",
    [
      ["Below goal", "StudyGoal(20).reached(15) is False"],
      ["Equality", "StudyGoal(20).reached(20) is True"],
      [
        "Independent targets",
        "StudyGoal(10).reached(15) is True and StudyGoal(30).reached(15) is False",
      ],
    ],
    ["Store the parameter on self.", "Use self.minutes inside reached."],
  ],
  [
    "Search without assuming a match",
    "Define contains(items, target) using a loop. Return True for a match and False after checking all items.",
    "def contains(items, target):\n    pass",
    "def contains(items, target):\n    for item in items:\n        if item == target:\n            return True\n    return False",
    [
      ["First item", "contains([10,20,30],10) is True"],
      ["Last item", "contains([10,20,30],30) is True"],
      ["Missing", "contains([10,20,30],40) is False"],
      ["Empty", "contains([],1) is False"],
    ],
    [
      "Return False only after the loop finishes.",
      "An early False inside the loop would miss later matches.",
    ],
  ],
  [
    "Summarize a week reliably",
    "Define summarize(sessions, goal) returning a dictionary with studied and remaining. Clamp remaining to zero. Do not mutate sessions.",
    "def summarize(sessions, goal):\n    pass",
    'def summarize(sessions, goal):\n    total = sum(sessions)\n    return {"studied": total, "remaining": max(0, goal - total)}',
    [
      [
        "Normal week",
        'summarize([20,30,15],100) == {"studied":65,"remaining":35}',
      ],
      ["Empty week", 'summarize([],100) == {"studied":0,"remaining":100}'],
      [
        "Exceeded goal",
        'summarize([120],100) == {"studied":120,"remaining":0}',
      ],
      ["Zero goal", 'summarize([],0) == {"studied":0,"remaining":0}'],
    ],
    [
      "Calculate the sum once and use it in both fields.",
      "Return a dictionary with the exact required keys.",
    ],
  ],
];
export const pythonChallenges = specs.map(
  ([title, prompt, starter, solution, tests, hints], index) => ({
    id: `py-${index + 1}`,
    title,
    prompt,
    starter,
    solution,
    language: "python",
    tests: tests.map(([name, expression]) => ({ name, expression })),
    hints,
  }),
);
