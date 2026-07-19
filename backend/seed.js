import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDatabase from './config/db.js';
import Booth from './models/Booth.js';
import Candidate from './models/Candidate.js';
import Constituency from './models/Constituency.js';
import Vote from './models/Vote.js';

dotenv.config();

// Party metadata
const PARTIES = {
  BJP: { code: 'BJP', color: '#FF9933' },
  INC: { code: 'INC', color: '#19A0FF' },
  BSP: { code: 'BSP', color: '#22409A' },
  ASP: { code: 'ASP', color: '#0066CC' },
  IND: { code: 'IND', color: '#808080' }
};

// Exact constituency and candidate data per specification
const constituencySeeds = [
  {
    name: 'Datia',
    district: 'Datia',
    state: 'Madhya Pradesh',
    // base percentages: BJP 41, INC 35, ASP 14, BSP 10
    candidates: [
      { name: 'Ashutosh Tiwari', party: 'Bharatiya Janata Party (BJP)', partyCode: PARTIES.BJP.code, partyColor: PARTIES.BJP.color, weight: 0.41 },
      { name: 'Ghanshyam Singh', party: 'Indian National Congress (INC)', partyCode: PARTIES.INC.code, partyColor: PARTIES.INC.color, weight: 0.35 },
      { name: 'Damodar Singh Yadav', party: 'Azad Samaj Party (Kanshi Ram)', partyCode: PARTIES.ASP.code, partyColor: PARTIES.ASP.color, weight: 0.14 },
      { name: 'BSP Candidate', party: 'Bahujan Samaj Party (BSP)', partyCode: PARTIES.BSP.code, partyColor: PARTIES.BSP.color, weight: 0.10 }
    ]
  },
  {
    name: 'Bhander (SC)',
    district: 'Datia',
    state: 'Madhya Pradesh',
    // INC 39, BJP 36, BSP 16, IND 9
    candidates: [
      { name: 'Ghanshyam Pironiya', party: 'Bharatiya Janata Party (BJP)', partyCode: PARTIES.BJP.code, partyColor: PARTIES.BJP.color, weight: 0.36 },
      { name: 'Phool Singh Baraiya', party: 'Indian National Congress (INC)', partyCode: PARTIES.INC.code, partyColor: PARTIES.INC.color, weight: 0.39 },
      { name: 'BSP Candidate', party: 'Bahujan Samaj Party (BSP)', partyCode: PARTIES.BSP.code, partyColor: PARTIES.BSP.color, weight: 0.16 },
      { name: 'Independent Candidate', party: 'Independent', partyCode: PARTIES.IND.code, partyColor: PARTIES.IND.color, weight: 0.09 }
    ]
  },
  {
    name: 'Dabra (SC)',
    district: 'Gwalior',
    state: 'Madhya Pradesh',
    // BJP 40, INC 34, BSP 18, IND 8
    candidates: [
      { name: 'Suresh Raje', party: 'Bharatiya Janata Party (BJP)', partyCode: PARTIES.BJP.code, partyColor: PARTIES.BJP.color, weight: 0.40 },
      { name: 'Imarti Devi', party: 'Indian National Congress (INC)', partyCode: PARTIES.INC.code, partyColor: PARTIES.INC.color, weight: 0.34 },
      { name: 'BSP Candidate', party: 'Bahujan Samaj Party (BSP)', partyCode: PARTIES.BSP.code, partyColor: PARTIES.BSP.color, weight: 0.18 },
      { name: 'Independent Candidate', party: 'Independent', partyCode: PARTIES.IND.code, partyColor: PARTIES.IND.color, weight: 0.08 }
    ]
  },
  {
    name: 'Bhitarwar',
    district: 'Gwalior',
    state: 'Madhya Pradesh',
    // BJP 42, INC 33, BSP 15, IND 10
    candidates: [
      { name: 'Mohan Singh Rathore', party: 'Bharatiya Janata Party (BJP)', partyCode: PARTIES.BJP.code, partyColor: PARTIES.BJP.color, weight: 0.42 },
      { name: 'Lakhan Singh Yadav', party: 'Indian National Congress (INC)', partyCode: PARTIES.INC.code, partyColor: PARTIES.INC.color, weight: 0.33 },
      { name: 'BSP Candidate', party: 'Bahujan Samaj Party (BSP)', partyCode: PARTIES.BSP.code, partyColor: PARTIES.BSP.color, weight: 0.15 },
      { name: 'Independent Candidate', party: 'Independent', partyCode: PARTIES.IND.code, partyColor: PARTIES.IND.color, weight: 0.10 }
    ]
  },
  {
    name: 'Karera (SC)',
    district: 'Shivpuri',
    state: 'Madhya Pradesh',
    // INC 38, BJP 37, BSP 17, IND 8
    candidates: [
      { name: 'Ramesh Prasad Khatik', party: 'Bharatiya Janata Party (BJP)', partyCode: PARTIES.BJP.code, partyColor: PARTIES.BJP.color, weight: 0.37 },
      { name: 'Pragilal Jatav', party: 'Indian National Congress (INC)', partyCode: PARTIES.INC.code, partyColor: PARTIES.INC.color, weight: 0.38 },
      { name: 'BSP Candidate', party: 'Bahujan Samaj Party (BSP)', partyCode: PARTIES.BSP.code, partyColor: PARTIES.BSP.color, weight: 0.17 },
      { name: 'Independent Candidate', party: 'Independent', partyCode: PARTIES.IND.code, partyColor: PARTIES.IND.color, weight: 0.08 }
    ]
  }
];

const boothNameTypes = [
  'Government Higher Secondary School',
  'Government Primary School',
  'Government Girls School',
  'Panchayat Bhawan',
  'Civil Hospital',
  'Community Health Centre',
  'ITI College',
  'Government College',
  'Anganwadi Kendra',
  'Primary Health Centre'
];

const locations = [
  'Civil Lines',
  'Station Road',
  'Jawahar Ganj',
  'Old Bus Stand',
  'Collectorate Road',
  'Shiv Colony',
  'Nehru Nagar',
  'Kamal Vihar',
  'New Town',
  'Market Area'
];

function jitterWeights(baseWeights) {
  // Apply ±5% absolute jitter (0.05) to each weight, clamp to [0.01, 0.99], then normalize
  const jittered = baseWeights.map((w) => {
    const delta = (Math.random() - 0.5) * 0.10; // ±0.05
    return Math.max(0.01, w + delta);
  });
  const total = jittered.reduce((s, v) => s + v, 0);
  return jittered.map((v) => v / total);
}

function distributeVotes(turnoutVotes, weights) {
  const normalized = jitterWeights(weights);
  const votes = [];
  let assigned = 0;
  for (let i = 0; i < normalized.length - 1; i += 1) {
    const v = Math.max(0, Math.round(turnoutVotes * normalized[i]));
    votes.push(v);
    assigned += v;
  }
  votes.push(Math.max(0, turnoutVotes - assigned));
  return votes;
}

async function seed() {
  await connectDatabase();
  console.log('Seeding MP constituencies...');

  // Defensive: remove an existing legacy unique index on `name` if present
  try {
    const indexes = await Candidate.collection.indexes();
    const nameIndex = indexes.find(idx => idx.name === 'name_1');
    if (nameIndex) {
      console.log('Dropping legacy index name_1 on candidates collection');
      await Candidate.collection.dropIndex('name_1');
    }
  } catch (err) {
    // Non-fatal. Continue seeding.
    console.warn('Could not drop legacy index (continuing):', err.message);
  }

  // Clear existing data
  await Promise.all([
    Vote.deleteMany({}),
    Booth.deleteMany({}),
    Candidate.deleteMany({}),
    Constituency.deleteMany({})
  ]);
  console.log('Cleared Vote, Booth, Candidate, Constituency collections');

  // Insert constituencies
  const constituencies = await Constituency.insertMany(
    constituencySeeds.map(({ candidates, ...c }) => c)
  );
  const byName = new Map(constituencies.map((c) => [c.name, c]));

  // Insert candidates tied to each constituency
  const candidateDocs = [];
  for (const seed of constituencySeeds) {
    const cons = byName.get(seed.name);
    for (const cand of seed.candidates) {
      candidateDocs.push({
        constituency: cons._id,
        name: cand.name,
        party: cand.party,
        partyCode: cand.partyCode,
        partyColor: cand.partyColor
      });
    }
  }

  const candidates = await Candidate.insertMany(candidateDocs);
  const candidatesByConst = new Map();
  for (const c of candidates) {
    const id = c.constituency.toString();
    const arr = candidatesByConst.get(id) || [];
    arr.push(c);
    candidatesByConst.set(id, arr);
  }

  // Create booths and vote distributions
  const boothSeeds = [];
  const voteDistributions = [];
  for (const cons of constituencies) {
    const seed = constituencySeeds.find((s) => s.name === cons.name);
    const baseWeights = seed.candidates.map((c) => c.weight);

    for (let i = 1; i <= 50; i += 1) {
      const totalVoters = 900 + Math.floor(Math.random() * 601); // 900-1500
      const turnoutFraction = 0.60 + Math.random() * 0.25; // 60%-85%
      const turnoutVotes = Math.floor(totalVoters * turnoutFraction);
      const type = boothNameTypes[Math.floor(Math.random() * boothNameTypes.length)];
      const loc = locations[Math.floor(Math.random() * locations.length)];

      boothSeeds.push({
        constituency: cons._id,
        boothNumber: i,
        name: `${type} - Booth ${i}`,
        location: `${loc}, ${cons.name}`,
        totalVoters,
        turnoutVotes
      });

      voteDistributions.push(distributeVotes(turnoutVotes, baseWeights));
    }
  }

  const booths = await Booth.insertMany(boothSeeds);

  // Build Vote docs: one per booth x candidate
  const voteSeeds = [];
  for (let i = 0; i < booths.length; i += 1) {
    const booth = booths[i];
    const dist = voteDistributions[i];
    const consCands = candidatesByConst.get(booth.constituency.toString()) || [];
    for (let j = 0; j < consCands.length; j += 1) {
      voteSeeds.push({
        booth: booth._id,
        candidate: consCands[j]._id,
        votesReceived: dist[j] || 0
      });
    }
  }

  await Vote.insertMany(voteSeeds);

  console.log(`Seeding completed: ${constituencies.length} constituencies, ${candidates.length} candidates, ${booths.length} booths, ${voteSeeds.length} votes.`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exitCode = 1;
});
