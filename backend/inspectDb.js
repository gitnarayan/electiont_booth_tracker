import dotenv from 'dotenv';
import connectDatabase from './config/db.js';
dotenv.config();
import Constituency from './models/Constituency.js';
import Booth from './models/Booth.js';
import Candidate from './models/Candidate.js';
import Vote from './models/Vote.js';
import mongoose from 'mongoose';

async function inspect() {
  await connectDatabase();
  const counts = await Promise.all([
    Constituency.countDocuments(),
    Candidate.countDocuments(),
    Booth.countDocuments(),
    Vote.countDocuments()
  ]);
  console.log('Counts: Constituency=%d, Candidate=%d, Booth=%d, Vote=%d', ...counts);

  const constituencies = await Constituency.find().lean();
  for (const c of constituencies) {
    const bCount = await Booth.countDocuments({ constituency: c._id });
    const candCount = await Candidate.countDocuments({ constituency: c._id });
    console.log(`- ${c.name}: booths=${bCount}, candidates=${candCount}`);
  }

  // Show sample booth with votes
  const sampleBooth = await Booth.findOne().lean();
  if (sampleBooth) {
    console.log('\nSample booth:', sampleBooth.name, sampleBooth.location, 'totalVoters:', sampleBooth.totalVoters, 'turnoutVotes:', sampleBooth.turnoutVotes);
    const votes = await Vote.find({ booth: sampleBooth._id }).populate('candidate', 'name party partyCode partyColor').lean();
    console.log('Votes for sample booth:');
    for (const v of votes) {
      console.log(`  ${v.candidate.name} (${v.candidate.partyCode}): ${v.votesReceived}`);
    }
  }

  await mongoose.disconnect();
}

inspect().catch((e) => { console.error(e); process.exit(1); });