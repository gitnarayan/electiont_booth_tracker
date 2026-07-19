import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDatabase from './config/db.js';
import Booth from './models/Booth.js';
import Candidate from './models/Candidate.js';
import Constituency from './models/Constituency.js';
import Vote from './models/Vote.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

function toPercentage(numerator, denominator) {
  return parseFloat(((numerator / denominator) * 100).toFixed(2));
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getVotesByBooth(boothIds) {
  if (!boothIds.length) {
    return new Map();
  }

  const votes = await Vote.find({ booth: { $in: boothIds } })
    .populate('candidate', 'name party')
    .sort({ votesReceived: -1 })
    .lean();

  return votes.reduce((byBooth, vote) => {
    if (!vote.candidate) {
      return byBooth;
    }

    const boothId = vote.booth.toString();
    const boothVotes = byBooth.get(boothId) || [];
    boothVotes.push(vote);
    byBooth.set(boothId, boothVotes);
    return byBooth;
  }, new Map());
}

function serializeBooth(booth, votes, constituencyName) {
  const leadingCandidate = votes.length
    ? {
        name: votes[0].candidate.name,
        party: votes[0].candidate.party,
        votes: votes[0].votesReceived
      }
    : null;

  return {
    id: booth._id.toString(),
    booth_number: booth.boothNumber,
    name: booth.name,
    location: booth.location,
    total_voters: booth.totalVoters,
    turnout_votes: booth.turnoutVotes,
    turnout_percentage: toPercentage(booth.turnoutVotes, booth.totalVoters),
    ...(constituencyName ? { constituency_name: constituencyName } : {}),
    votes: votes.map((vote) => ({
      candidate_id: vote.candidate._id.toString(),
      name: vote.candidate.name,
      party: vote.candidate.party,
      votes: vote.votesReceived
    })),
    leading_candidate: leadingCandidate
  };
}

// 1. Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const boothCount = await Booth.countDocuments();
    res.json({
      status: 'ok',
      database: 'connected',
      booths: boothCount
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// 2. GET all constituencies with aggregate stats
app.get('/api/constituencies', async (req, res) => {
  try {
    const [constituencies, boothStats, leaders] = await Promise.all([
      Constituency.find().lean(),
      Booth.aggregate([
        {
          $group: {
            _id: '$constituency',
            total_booths: { $sum: 1 },
            total_voters: { $sum: '$totalVoters' },
            turnout_votes: { $sum: '$turnoutVotes' }
          }
        }
      ]),
      Vote.aggregate([
        { $lookup: { from: Booth.collection.name, localField: 'booth', foreignField: '_id', as: 'booth' } },
        { $unwind: '$booth' },
        { $lookup: { from: Candidate.collection.name, localField: 'candidate', foreignField: '_id', as: 'candidate' } },
        { $unwind: '$candidate' },
        {
          $group: {
            _id: { constituency: '$booth.constituency', candidate: '$candidate._id' },
            candidate_name: { $first: '$candidate.name' },
            party: { $first: '$candidate.party' },
            total_votes: { $sum: '$votesReceived' }
          }
        },
        { $sort: { '_id.constituency': 1, total_votes: -1 } },
        {
          $group: {
            _id: '$_id.constituency',
            leader: {
              $first: {
                name: '$candidate_name',
                party: '$party',
                votes: '$total_votes'
              }
            }
          }
        }
      ])
    ]);

    const statsByConstituency = new Map(boothStats.map((stat) => [stat._id.toString(), stat]));
    const leadersByConstituency = new Map(leaders.map((entry) => [entry._id.toString(), entry.leader]));

    res.json(constituencies.map((constituency) => {
      const stats = statsByConstituency.get(constituency._id.toString());

      if (!stats) {
        return {
          id: constituency._id.toString(),
          name: constituency.name,
          state: constituency.state,
          total_booths: 0,
          total_voters: null,
          turnout_votes: null,
          turnout_percentage: 0,
          leading_candidate: null
        };
      }

      return {
        id: constituency._id.toString(),
        name: constituency.name,
        state: constituency.state,
        total_booths: stats.total_booths,
        total_voters: stats.total_voters,
        turnout_votes: stats.turnout_votes,
        turnout_percentage: toPercentage(stats.turnout_votes, stats.total_voters),
        leading_candidate: leadersByConstituency.get(constituency._id.toString()) || null
      };
    }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. GET all booths for a specific constituency
app.get('/api/constituencies/:id/booths', async (req, res) => {
  const constituencyId = req.params.id;
  if (!mongoose.isObjectIdOrHexString(constituencyId)) {
    return res.status(400).json({ error: 'Invalid constituency ID format.' });
  }

  try {
    const constituency = await Constituency.findById(constituencyId).lean();
    if (!constituency) {
      return res.status(404).json({ error: `Constituency with ID ${constituencyId} not found.` });
    }

    const booths = await Booth.find({ constituency: constituency._id }).sort({ boothNumber: 1 }).lean();
    const votesByBooth = await getVotesByBooth(booths.map((booth) => booth._id));

    res.json({
      constituency_name: constituency.name,
      booths: booths.map((booth) => serializeBooth(booth, votesByBooth.get(booth._id.toString()) || []))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. GET search for a booth by name or number
app.get('/api/booths/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: "Search query parameter 'q' is required." });
  }

  try {
    const searchTerm = String(query);
    const booths = await Booth.find({
      $or: [
        { name: { $regex: escapeRegex(searchTerm), $options: 'i' } },
        { $expr: { $eq: [{ $toString: '$boothNumber' }, searchTerm] } }
      ]
    })
      .populate('constituency', 'name')
      .limit(50)
      .lean();

    const votesByBooth = await getVotesByBooth(booths.map((booth) => booth._id));

    res.json(booths.map((booth) => serializeBooth(
      booth,
      votesByBooth.get(booth._id.toString()) || [],
      booth.constituency?.name
    )));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. POST Auth Login (Analytics Team Login)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  // Pre-seeded credentials for Analytics team
  if (username === 'admin' && password === 'password123') {
    return res.json({
      success: true,
      token: 'mock-jwt-token-analytics-12345',
      user: {
        name: 'Analytics Officer',
        username: 'admin',
        role: 'analyst'
      }
    });
  }

  res.status(401).json({ error: 'Invalid username or password.' });
});

async function startServer() {
  await connectDatabase();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Election API server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Unable to start Election API server:', error.message);
  process.exit(1);
});
