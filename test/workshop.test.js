const request = require('supertest');
const app = require('../app'); // Adjust the path if needed

describe('Workshop API', () => {
  let workshopId;

  it('should create a workshop', async () => {
    const res = await request(app)
      .post('/workshops')
      .send({ title: 'Node Workshop', seats: 2 });
    if (res.status !== 201) throw new Error('Failed to create workshop');
    workshopId = res.body.id;
  });

  it('should register a participant as confirmed', async () => {
    const res = await request(app)
      .post(`/workshops/${workshopId}/register`)
      .send({ name: 'Alice', email: 'alice@example.com' });
    if (res.status !== 201 || res.body.status !== 'registered') {
      throw new Error('Failed to register participant as confirmed');
    }
  });

  it('should register a second participant as confirmed', async () => {
    const res = await request(app)
      .post(`/workshops/${workshopId}/register`)
      .send({ name: 'Bob', email: 'bob@example.com' });
    if (res.status !== 201 || res.body.status !== 'registered') {
      throw new Error('Failed to register second participant as confirmed');
    }
  });

  it('should add a participant to the waitlist if workshop is full', async () => {
    const res = await request(app)
      .post(`/workshops/${workshopId}/register`)
      .send({ name: 'Charlie', email: 'charlie@example.com' });
    if (res.status !== 201 || res.body.status !== 'waitlist') {
      throw new Error('Failed to add participant to waitlist');
    }
  });

  it('should cancel a confirmed participant and move the first waitlisted participant in', async () => {
    // Cancel registration for Alice
    const cancelRes = await request(app)
      .post(`/workshops/${workshopId}/cancel`)
      .send({ email: 'alice@example.com' });
    if (cancelRes.status !== 200) throw new Error('Cancellation failed');

    // Retrieve the workshop to verify that Charlie moved from waitlist to confirmed
    const getRes = await request(app).get(`/workshops/${workshopId}`);
    const participantEmails = getRes.body.participants.map(p => p.email);
    if (!participantEmails.includes('charlie@example.com')) {
      throw new Error('Waitlisted participant was not moved to registered');
    }
  });
});
