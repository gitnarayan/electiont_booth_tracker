import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema(
  {
    booth: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booth',
      required: true
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true
    },
    votesReceived: { type: Number, required: true, min: 0 }
  },
  { timestamps: true }
);

voteSchema.index({ booth: 1, candidate: 1 }, { unique: true });

export default mongoose.model('Vote', voteSchema);
