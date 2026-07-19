import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema(
  {
    constituency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Constituency',
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    party: {
      type: String,
      required: true,
      trim: true,
    },

    partyCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    partyColor: {
      type: String,
      default: '#808080',
      trim: true,
    }
  },
  { timestamps: true }
);

candidateSchema.index(
  {
    constituency: 1,
    name: 1,
  },
  {
    unique: true,
  }
);

export default mongoose.model('Candidate', candidateSchema);
