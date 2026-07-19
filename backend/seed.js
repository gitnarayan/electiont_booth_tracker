import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDatabase from './config/db.js';
import Booth from './models/Booth.js';
import Candidate from './models/Candidate.js';
import Constituency from './models/Constituency.js';
import Vote from './models/Vote.js';

dotenv.config();

const constituencies = [
  { name: 'East District', state: 'State A' },
  { name: 'West Valley', state: 'State A' },
  { name: 'North Hills', state: 'State B' },
  { name: 'South Coast', state: 'State B' },
  { name: 'Central Metro', state: 'State C' }
];

const candidates = [
  { name: 'Rajesh Kumar', party: 'Progressive Party (PRG)' },
  { name: 'Priya Sharma', party: 'Conservative Party (CON)' },
  { name: 'Amit Patel', party: 'Liberal Alliance (LIB)' },
  { name: 'Sunita Devi', party: 'Independent (IND)' }
];

const constituencyWeights = {
  'East District': [0.45, 0.25, 0.15, 0.15],
  'West Valley': [0.20, 0.50, 0.15, 0.15],
  'North Hills': [0.15, 0.15, 0.50, 0.20],
  'South Coast': [0.20, 0.15, 0.20, 0.45],
  'Central Metro': [0.28, 0.27, 0.25, 0.20]
};

const boothTypes = [
  'Government High School',
  'Panchayat Community Center',
  'Public Library',
  'Municipal Office',
  'Civil Dispensary'
];

const areas = [
  'Sector 1',
  'Market Road',
  'Green Enclave',
  'Subhash Nagar',
  'Railway Colony',
  'Nehru Chowk',
  'High Street'
];

function distributeVotes(turnoutVotes, weights) {
  const noisyWeights = weights.map((weight) => Math.max(0.05, weight + (Math.random() - 0.5) * 0.1));
  const weightTotal = noisyWeights.reduce((total, weight) => total + weight, 0);
  const normalizedWeights = noisyWeights.map((weight) => weight / weightTotal);
  const votes = [];
  let assignedVotes = 0;

  for (let index = 0; index < normalizedWeights.length - 1; index += 1) {
    const candidateVotes = Math.round(turnoutVotes * normalizedWeights[index]);
    votes.push(candidateVotes);
    assignedVotes += candidateVotes;
  }

  votes.push(turnoutVotes - assignedVotes);
  return votes;
}

async function seed() {
  await connectDatabase();
  console.log('Seeding MongoDB started...');

  await Promise.all([
    Vote.deleteMany({}),
    Booth.deleteMany({}),
    Constituency.deleteMany({}),
    Candidate.deleteMany({})
  ]);
  console.log('Cleared existing MongoDB data.');

  const seededConstituencies = await Constituency.insertMany(constituencies);
  const seededCandidates = await Candidate.insertMany(candidates);
  const constituenciesByName = new Map(seededConstituencies.map((constituency) => [constituency.name, constituency]));

  const boothSeeds = [];
  const voteDistributions = [];

  for (const constituency of seededConstituencies) {
    const boothCount = 30 + Math.floor(Math.random() * 11);
    const weights = constituencyWeights[constituency.name] || [0.25, 0.25, 0.25, 0.25];

    for (let boothNumber = 1; boothNumber <= boothCount; boothNumber += 1) {
      const totalVoters = 800 + Math.floor(Math.random() * 701);
      const turnoutVotes = Math.floor(totalVoters * (0.55 + Math.random() * 0.30));
      const type = boothTypes[Math.floor(Math.random() * boothTypes.length)];
      const area = areas[Math.floor(Math.random() * areas.length)];

      boothSeeds.push({
        constituency: constituenciesByName.get(constituency.name)._id,
        boothNumber,
        name: `${type} - Room ${boothNumber}`,
        location: `${area}, ${constituency.name}`,
        totalVoters,
        turnoutVotes
      });
      voteDistributions.push(distributeVotes(turnoutVotes, weights));
    }
  }

  const seededBooths = await Booth.insertMany(boothSeeds);
  const voteSeeds = seededBooths.flatMap((booth, boothIndex) => (
    seededCandidates.map((candidate, candidateIndex) => ({
      booth: booth._id,
      candidate: candidate._id,
      votesReceived: voteDistributions[boothIndex][candidateIndex]
    }))
  ));
  await Vote.insertMany(voteSeeds);

  console.log(
    `Seeding completed. Seeded ${seededConstituencies.length} constituencies, ${seededCandidates.length} candidates, ${seededBooths.length} booths, and ${voteSeeds.length} vote records.`
  );
}

seed()
  .catch((error) => {
    console.error('MongoDB seeding failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
