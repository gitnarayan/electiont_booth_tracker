import mongoose from 'mongoose';

const boothSchema = new mongoose.Schema(
  {
    constituency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Constituency',
      required: true,
      index: true
    },
    boothNumber: { type: Number, required: true, min: 1 },
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    totalVoters: { type: Number, required: true, min: 1 },
    turnoutVotes: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator(value) {
          return value <= this.totalVoters;
        },
        message: 'turnoutVotes cannot exceed totalVoters.'
      }
    }
  },
  { timestamps: true }
);

boothSchema.index({ constituency: 1, boothNumber: 1 }, { unique: true });

export default mongoose.model('Booth', boothSchema);
