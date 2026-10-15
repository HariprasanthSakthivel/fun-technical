"""Seed initial data into SQLite database from existing mock data."""

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.models import (
    GameSession,
    Question,
    SessionQuestion,
    SessionTeam,
    Team,
    TeamMember,
    User,
)


def seed_database():
    db = SessionLocal()
    try:
        # 1. Create default admin if not exists
        if not db.query(User).filter(User.username == "admin").first():
            admin = User(
                username="admin",
                email="admin@funtech.internal",
                password_hash=hash_password("admin123"),
                role="admin",
                is_active=True,
            )
            db.add(admin)
            print("[OK] Default admin created (admin / admin123)")

        # 2. Seed Teams
        initial_teams = [
            ("T01", "Team Alpha", "ALPHA", "Alex Rivera", 4, ["Alex Rivera", "David Chen", "Sarah Jenkins", "Michael Scott"], "active", "Core engineering team"),
            ("T02", "Team Beta", "BETA", "Priya Sharma", 3, ["Priya Sharma", "Liam Vance", "Emma Watson"], "active", "Platform infrastructure team"),
            ("T03", "Team Gamma", "GAMMA", "Carlos Mendez", 4, ["Carlos Mendez", "Aisha Khan", "John Doe", "Lisa Ray"], "active", "Data & ML engineering"),
            ("T04", "Team Delta", "DELTA", "Rachel Green", 3, ["Rachel Green", "Ross Geller", "Chandler Bing"], "active", "Application Security team"),
            ("T05", "Team Epsilon", "EPSLN", "Jordan Lee", 4, ["Jordan Lee", "Marcus Bell", "Elena Rostova", "Kevin Park"], "active", "Mobile apps guild"),
            ("T06", "Team Zeta", "ZETA", "Vikram Malhotra", 3, ["Vikram Malhotra", "Samira Patel", "Devon Miles"], "active", "Cloud & DevOps team"),
            ("T07", "Team Eta", "ETA", "Hannah Abbott", 4, ["Hannah Abbott", "Neville Longbottom", "Luna Lovegood", "Dean Thomas"], "active", "Frontend UX Guild"),
            ("T08", "Team Theta", "THETA", "Arthur Dent", 3, ["Arthur Dent", "Ford Prefect", "Trillian Astra"], "inactive", "Quality assurance & testing team"),
            ("T09", "Team Iota", "IOTA", "Grace Hopper", 4, ["Grace Hopper", "Ada Lovelace", "Alan Turing", "Claude Shannon"], "active", "Core algorithms guild"),
            ("T10", "Team Kappa", "KAPPA", "Linus Torvalds", 3, ["Linus Torvalds", "Ken Thompson", "Dennis Ritchie"], "active", "System architecture group"),
        ]

        for t_id, name, code, leader, count, members, status, desc in initial_teams:
            if not db.query(Team).filter(Team.id == t_id).first():
                team = Team(
                    id=t_id,
                    team_name=name,
                    team_code=code,
                    team_leader=leader,
                    member_count=count,
                    status=status,
                    description=desc,
                )
                for m in members:
                    team.members.append(TeamMember(member_name=m))
                db.add(team)
        db.commit()
        print("[OK] Teams seeded")

        # 3. Seed Questions
        initial_questions = [
            ("Q001", "guess-tech", "Identify the framework from this code snippet", "A TypeScript code snippet is shown. Name the UI framework or library.", "text", "import { useState, useEffect } from 'react';\n\nexport function Counter() {\n  const [count, setCount] = useState(0);\n  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;\n}", "React", ["ReactJS", "React.js"], "The useState hook and JSX syntax are characteristic of React.", "medium", 1, "ready", "Frontend"),
            ("Q002", "guess-tech", "Which language uses this goroutine pattern?", "Examine the concurrent code snippet and identify the programming language.", "text", "package main\n\nimport (\n    \"fmt\"\n    \"time\"\n)\n\nfunc worker(id int, ch chan int) {\n    ch <- id * 2\n}\n\nfunc main() {\n    ch := make(chan int)\n    go worker(1, ch)\n    fmt.Println(<-ch)\n}", "Go", ["Golang"], "The go keyword, channels (chan), and package main are Go syntax.", "easy", 2, "ready", "Languages"),
            ("Q003", "guess-tech", "Name the tool from these command flags", "Several CLI command invocations are shown. Which developer tool is being executed?", "text", "tool init\ntool plan -out=tfplan\ntool apply tfplan\ntool destroy", "Terraform", ["HashiCorp Terraform", "OpenTofu"], "plan, apply, and destroy with tfplan files are standard Terraform CLI commands.", "easy", 3, "ready", "DevOps"),
            ("Q004", "guess-tech", "Identify the database query syntax", "A database query is shown. Name the database technology or query dialect.", "text", "db.users.aggregate([\n  { $match: { status: 'active' } },\n  { $group: { _id: '$department', total: { $sum: 1 } } },\n  { $sort: { total: -1 } }\n])", "MongoDB", ["Mongo"], "The db.collection.aggregate syntax with $match and $group pipeline operators is MongoDB.", "medium", 4, "ready", "Databases"),
            ("Q005", "guess-tech", "Which Python web framework uses this syntax?", "A Python route definition is shown. Identify the specific web framework.", "text", "from pydantic import BaseModel\n\nclass Item(BaseModel):\n    name: str\n    price: float\n\n@app.post('/items/', response_model=Item, status_code=201)\nasync def create_item(item: Item):\n    return item", "FastAPI", [], "Combining async def route handlers with Pydantic response_model is FastAPI.", "medium", 5, "ready", "Frameworks"),
            ("Q006", "guess-tech", "Spot the technology from this configuration", "A configuration file snippet is shown. Which tool uses this format?", "text", "server {\n    listen 80;\n    server_name example.com;\n    location / {\n        proxy_pass http://localhost:3000;\n        proxy_set_header Host $host;\n    }\n}", "Nginx", ["nginx"], "server, listen, location, and proxy_pass blocks are standard Nginx configuration syntax.", "easy", 6, "ready", "Infrastructure"),
            ("Q007", "guess-tech", "Identify the CI/CD platform from this YAML", "A CI/CD workflow file is shown. Name the platform running it.", "text", "name: CI Pipeline\non: [push, pull_request]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm test", "GitHub Actions", ["GH Actions", "Actions"], "The on: [push] trigger and runs-on: ubuntu-latest are GitHub Actions syntax.", "easy", 7, "ready", "CI/CD"),
            ("Q008", "guess-tech", "Name the framework from this decorator syntax", "A TypeScript component is shown. Which framework uses this decorator pattern?", "text", "@Component({\n  selector: 'app-root',\n  template: '<h1>{{title}}</h1>'\n})\nexport class AppComponent {\n  title = 'my-app';\n}", "Angular", ["AngularJS"], "The @Component decorator and selector property are core Angular concepts.", "medium", 8, "ready", "Frameworks"),
            ("Q009", "guess-tech", "Spot the package manager from this lockfile", "A lockfile is shown on screen. Which package manager generated it?", "text", "lockfileVersion: '6.0'\nspecifiers:\n  react: ^18.0.0\npackages:\n  react@18.2.0:\n    resolution: {integrity: sha512-...}", "pnpm", ["PNPM"], "The lockfileVersion key and package structure are specific to pnpm-lock.yaml.", "easy", 9, "ready", "Package Managers"),
            ("Q010", "guess-tech", "Name the cloud provider from its service icons", "Multiple service icons are displayed. Which cloud provider offers all of these?", "text", "S3 Storage, EC2 Elastic Compute Cloud, and AWS Lambda serverless functions.", "AWS", ["Amazon Web Services", "Amazon"], "S3, EC2, and Lambda are AWS cloud services.", "easy", 10, "ready", "Cloud"),
            ("Q011", "guess-tech", "Identify the orchestration platform from this YAML", "A deployment configuration is shown. What platform is it written for?", "text", "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: my-app\nspec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: my-app", "Kubernetes", ["k8s", "K8s"], "The apiVersion, kind: Deployment, and spec.replicas fields are Kubernetes syntax.", "hard", 11, "ready", "Orchestration"),
            ("Q012", "guess-tech", "Which testing library uses this describe/it API?", "A test file is shown. Name the testing library or framework.", "text", "import { describe, it, expect } from 'vitest';\ndescribe('add', () => {\n  it('returns sum', () => {\n    expect(1 + 1).toBe(2);\n  });\n});", "Vitest", [], "Vitest is a Vite-native test framework with a Jest-compatible API.", "medium", 12, "archived", "Testing"),
            # Explain Without Naming
            ("Q013", "explain-without-naming", "Dependency Injection", "Explain this software design pattern to your team without saying the topic name or any prohibited word.", "text", None, "Dependency Injection", ["DI Pattern", "IoC"], "A technique where an object receives its dependencies from external code.", "hard", 1, "ready", None, "Dependency Injection", "A technique where an object receives its dependencies from external code rather than creating them itself.", ["Dependency", "Injection", "inject", "DI"], 90),
            ("Q014", "explain-without-naming", "Middleware", "Explain this concept to your team without saying the topic name or any prohibited word.", "text", None, "Middleware", ["middleware layer"], "Software that connects different software components or enterprise applications.", "easy", 2, "ready", None, "Middleware", "Software that connects different software components or enterprise applications.", ["Middleware", "middle", "layer"], 60),
            ("Q015", "explain-without-naming", "Dockerfile", "Explain this file format to your team without saying the topic name or any prohibited word.", "text", None, "Dockerfile", ["Docker file"], "A text document containing commands to assemble a container image.", "medium", 3, "ready", None, "Dockerfile", "A text document containing commands to assemble a container image.", ["Dockerfile", "Docker", "file", "container"], 75),
            ("Q016", "explain-without-naming", "Remote Procedure Call (RPC)", "Explain this communication pattern to your team without saying the topic name.", "text", None, "Remote Procedure Call", ["RPC"], "A protocol for executing a procedure on another computer as if it were local.", "medium", 4, "ready", None, "Remote Procedure Call", "A protocol for executing a procedure on another computer as if it were local.", ["RPC", "Remote", "Procedure", "Call"], 90),
            ("Q017", "explain-without-naming", "Memoization", "Explain this performance technique to your team without saying the topic name.", "text", None, "Memoization", ["Memoize", "Memo pattern"], "An optimization that stores results of expensive function calls.", "easy", 5, "ready", None, "Memoization", "An optimization that stores results of expensive function calls and returns cached result.", ["Memoize", "Memoization", "memo", "cache", "caching"], 60),
            ("Q018", "explain-without-naming", "Encapsulation", "Explain this OOP principle to your team without saying the topic name.", "text", None, "Encapsulation", ["Data Hiding"], "The bundling of data and methods that operate on that data within one unit.", "easy", 6, "draft", None, "Encapsulation", "The bundling of data and methods that operate on that data within one unit, hiding internal state.", ["Encapsulate", "Encapsulation", "hide", "hiding"], 60),
        ]

        for q_tuple in initial_questions:
            q_id = q_tuple[0]
            if not db.query(Question).filter(Question.id == q_id).first():
                q = Question(
                    id=q_id,
                    game_type=q_tuple[1],
                    title=q_tuple[2],
                    instructions=q_tuple[3],
                    content_type=q_tuple[4],
                    text_content=q_tuple[5],
                    correct_answer=q_tuple[6],
                    accepted_answers=q_tuple[7],
                    explanation=q_tuple[8],
                    difficulty=q_tuple[9],
                    question_order=q_tuple[10],
                    status=q_tuple[11],
                    technology_category=q_tuple[12],
                )
                if len(q_tuple) > 13:
                    q.secret_topic = q_tuple[13]
                    q.topic_description = q_tuple[14]
                    q.prohibited_words = q_tuple[15]
                    q.estimated_time = q_tuple[16]
                db.add(q)
        db.commit()
        print("[OK] Questions seeded")

        # 4. Seed Sessions
        if not db.query(GameSession).filter(GameSession.id == "S01").first():
            s1 = GameSession(
                id="S01",
                session_code="TECH-4821",
                session_name="Tech Quiz — Round 1",
                description="First elimination round for engineering teams",
                game_type="guess-tech",
                status="ready",
                scheduled_at="2026-10-20 10:00",
                game_rules={
                    "maxEligibleTeams": 3,
                    "answerSubmission": "eligible_only",
                    "correctAnswerReveal": "manual",
                    "questionProgression": "manual",
                    "scoreboardVisibility": "hidden",
                    "questionTimerSeconds": 60,
                    "enableBuzzer": True,
                },
                created_by="admin",
            )
            for idx, q_id in enumerate(["Q001", "Q002", "Q003", "Q004", "Q005", "Q006", "Q007", "Q008", "Q009", "Q010"]):
                s1.session_questions.append(SessionQuestion(question_id=q_id, question_order=idx + 1))
            for t_id in ["T01", "T02", "T03", "T04"]:
                s1.session_teams.append(SessionTeam(team_id=t_id, participation_status="registered"))
            db.add(s1)

        if not db.query(GameSession).filter(GameSession.id == "S02").first():
            s2 = GameSession(
                id="S02",
                session_code="EXPL-9142",
                session_name="Explain-It Challenge",
                description="Cross-team communication and technical vocabulary challenge",
                game_type="explain-without-naming",
                status="draft",
                scheduled_at="2026-10-21 14:00",
                game_rules={
                    "maxEligibleTeams": 2,
                    "answerSubmission": "eligible_only",
                    "correctAnswerReveal": "manual",
                    "questionProgression": "manual",
                    "scoreboardVisibility": "hidden",
                    "questionTimerSeconds": 90,
                    "enableBuzzer": True,
                },
                created_by="admin",
            )
            for idx, q_id in enumerate(["Q013", "Q014", "Q015", "Q016", "Q017"]):
                s2.session_questions.append(SessionQuestion(question_id=q_id, question_order=idx + 1))
            for t_id in ["T05", "T06", "T07"]:
                s2.session_teams.append(SessionTeam(team_id=t_id, participation_status="registered"))
            db.add(s2)

        db.commit()
        print("[OK] Sessions seeded")

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
