Workshop Signup API with Automatic Waitlist
Your client hosts small workshops. Each workshop has a limited number of seats. Participants can sign up. When the workshop is full, new participants should automatically join a waiting list. If an enrolled participant cancels, the first person on the waiting list should automatically be moved into the workshop.

You are tasked with designing a simple backend API using Node.js and Express, including:

Required endpoints:

POST /workshops (Create a workshop with a title and limited seats.)
POST /workshops/:id/register (Register a participant with a name and email.)
POST /workshops/:id/cancel (Cancel a participant's registration using their email.)
Core Logic:

Automatic waitlist management (if someone cancels, the first waitlisted person moves in).
