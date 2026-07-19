import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    party: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

export default mongoose.model('Candidate', candidateSchema);
