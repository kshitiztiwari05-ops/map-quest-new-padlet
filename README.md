# MapQuest (pilot)
Your mockup UI, now served by a real Node + Express 5 backend.

    npm install
    TEACHER_CODE=choose-a-code JWT_SECRET=long-random-text npm start
    # open http://localhost:3000

- Students: Create account (role Student) -> Write -> Submit for approval.
- Teachers: Create account (role Teacher, with the teacher code) -> Teacher dashboard -> Approve / Send back.
- Approved posts appear in Stories, can be liked, and filtered by the state map.
- Data is stored in data/db.json (back it up; fine for a classroom pilot).
